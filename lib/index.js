'use strict';
const fs = require('fs');
const TurndownService = require('turndown');
const got = require('got');
const { parse: parseUrl } = require('url');
const { exists, listDir, readFile } = require('hexo-fs');
const parseFeed = require('./feed');
const { slugize, unescapeHTML } = require('hexo-util');
const { join, parse, resolve } = require('path');
const del = require('delete');
const axios = require('axios');
const yaml = require('yamljs');
const _config = yaml.load(resolve('.', '_config.yml'));
const butterfly = require('./butterfly');
const colors=require('colors');
var util = {
  type: {
    Object: '[object Object]',
    Undefined: '[object Undefined]'
  },
  judge: function(d, t) { return Object.prototype.toString.call(d) === this.type[t]; },
  isUndefined: function(d) { return this.judge(d, 'Undefined'); },
  isObject: function(d) { return this.judge(d, 'Object'); },
  isArray: function(d) { return Array.isArray(d); },
  mergeJson: function(oa, ob) {
    if (!util.isObject(oa) || !util.isObject(ob)) {
      return ob;
    }
    for (const i in oa) {
      // ob[i] 不存在，或者为 undefined，则用 oa[i] 替换
      if (util.isUndefined(ob[i])) {
        ob[i] = oa[i];
      }
      // 两个都为对象继续迭代
      if (util.isObject(oa[i]) && util.isObject(ob[i])) {
        util.mergeJson(oa[i], ob[i]);
      }
      if (util.isArray(oa[i]) && util.isArray(ob[i])) {
        ob[i].concat(oa[i]);
      }
    }
    return ob;
  }
};
const merge = util.mergeJson;
const readerConfig = merge(
  {
    rss: {
      enable: true,
      path: 'source/_data/rss.yml' // 配置 url
    },
    menu: {
      path: 'source/_data/menu.yml',
      icon: 'icon', // 指定图标name
      name: 'name', // 指定图标name
      url: 'url' // 指定链接name
    },
    clone: { // 克隆配置
      enable: false,
      path: 'source/_data/clone.yml'
    }
  },
  _config.reader
);

let linkData = []; let cloneDataArr = [];
async function getConfigData(tp) {
  let result = [];
  if (readerConfig[tp] && Array.isArray(readerConfig[tp])) {
    result = readerConfig[tp];
  } else if (/^http(s)?:\/\//.test(readerConfig[tp].path)) {
    try {
      const {data} = await axios.get(readerConfig[tp].path);
      result = yaml.parse(data);
    } catch (e) {
      throw Error('获取配置文件失败！失败链接：' + readerConfig[tp].path);
    }
  } else {
    result = yaml.load(resolve('.', readerConfig[tp].path));
  }
  return result;
}
async function create(args, config, log, Post, items) {
  const source = args._.shift();
  const { alias } = args;
  const skipduplicate = Object.prototype.hasOwnProperty.call(args, 'skipduplicate');
  let { limit } = args;
  const tomd = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

  let untitledPostCounter = 0;
  let errNum = 0;
  let skipNum = 0;
  let input, feed;
  const tagExcerpt = '<a id="more"></a>';
  const rExcerpt = /<!-- ?more ?-->/i;
  const postExcerpt = '\n<!-- more -->\n';
  const rEntity = /&#?\w{2,4};/;
  const posts = [];
  let currentPosts = [];

  const md = str => {
    return tomd.turndown(str);
  };

  try {
    if (!source) {
      const help = [
        'Usage: hexo migrate rss <source> [--alias]',
        '',
        'For more help, you can check the docs: https://cxvh.com'
      ];

      throw help.join('\n');
    }
    if (/^http(s)?:\/\//i.test(source)) {
      input = await got(source, { resolveBodyOnly: true, retry: 0 });
    } else {
      input = await readFile(source);
    }
    log.i('Analyzing %s...', source);

    feed = await parseFeed(input);
  } catch (err) {
    console.log(colors.cyan('读取文件失败！失败链接：') + source);
    throw new Error({ err, items });
  }

  if (feed) {
    if (typeof limit !== 'number' || limit > feed.items.length || limit <= 0) limit = feed.items.length;

    for (let i = 0; i < limit; i++) {
      const item = feed.items[i];
      const { date, tags, link, id } = item;
      // tags.unshift(items.categories);
      items.tag && tags.unshift(items.tag);
      tags.unshift(items.name);
      let { content, excerpt, title } = item;

      if (excerpt) {
        if (rEntity.test(excerpt)) excerpt = unescapeHTML(excerpt);
        if (content.includes(excerpt)) content = content.replace(excerpt, '');
        if (content.includes(tagExcerpt)) content = content.replace(tagExcerpt, '');

        content = md(excerpt) + postExcerpt + md(content);
      } else if (rExcerpt.test(content)) {
        content.replace(rExcerpt, (match, index) => {
          const excerpt = content.substring(0, index).trim();
          const more = content.substring(index + match.length).trim();

          content = md(excerpt) + postExcerpt + md(more);
        });
      } else {
        content = md(content);
      }

      if (!title) {
        untitledPostCounter += 1;
        const untitledPostTitle = 'Untitled Post - ' + untitledPostCounter;
        title = untitledPostTitle;
        log.w('Post found but without any titles. Using %s', untitledPostTitle);
      } else {
        log.i('Post found: %s', title);
      }

      if (rEntity.test(title)) title = unescapeHTML(title);
      if (title.includes('"') && (title.includes(':') || title.startsWith('#') || title.startsWith('!!'))) title = title.replace(/"/g, '\\"');

      const newPost = {
        title,
        date,
        link,
        categories: tags,
        excerpt,
        content
      };

      if (alias && link) {
        newPost.alias = parseUrl(link).pathname;
      }

      posts.push(newPost);
    }
  }

  if (skipduplicate) {
    const postFolder = join(config.source_dir, '_posts');
    const folderExist = await exists(postFolder);
    const files = folderExist ? await listDir(join(config.source_dir, '_posts')) : [];
    currentPosts = files.map(file => slugize(parse(file).name, { transform: 1 }));
  }

  if (posts.length >= 1) {
    for (const post of posts) {
      if (currentPosts.length && skipduplicate) {
        if (currentPosts.includes(slugize(post.title, { transform: 1 }))) {
          skipNum++;
          continue;
        }
      }
      try {
        await Post.create(post);
      } catch (err) {
        log.error({ err, post });
        errNum++;
      }
    }

    const postsNum = posts.length - errNum - skipNum;
    if (untitledPostCounter) {
      log.w('%d posts did not have titles and were prefixed with "Untitled Post".', untitledPostCounter);
    }
    if (postsNum) log.i('%d posts migrated.', postsNum);
    if (errNum) log.error('%d posts failed to migrate.', errNum);
    if (skipNum) log.i('%d posts skipped.', skipNum);
  }
}

module.exports = async function(_hexo,args) {
  const _this=_hexo;
  linkData = await getConfigData('rss');
  // 判断是否要生成 rss 订阅
  if (Array.isArray(readerConfig.rss) || readerConfig.rss.enable) {
    args._.unshift('');
    const _themeConfigMenu = [];
    try {
      for (let i = 0; i < linkData.length; i++) {
        const categories = linkData[i];
        del.sync([_config.source_dir + '/_posts/' + categories.name + '/**/**']);
        _themeConfigMenu.push({
          [readerConfig.menu.icon]: categories.class,
          [readerConfig.menu.name]: categories.name,
          [readerConfig.menu.url]: '/' + categories.name
        });
        for (let j = 0; j < categories.list.length; j++) {
          if (typeof categories.list[0] === 'string') {
            args._[0] = categories.list[j];
            _this.config.new_post_name = `${categories.name}/:title.md`;
          } else {
            const tag = Object.keys(categories.list[j])[0];
            args._[0] = categories.list[j][tag];
            _this.config.new_post_name = `${categories.name}/${tag}/:title.md`;
            categories.tag = tag;
          }
          await create(args, _this.config, _this.log, _this.post, categories);
        }
        // await create(args);
      }
    } catch (e) {
      console.log({e});
    }
    fs.writeFileSync(resolve('.', readerConfig.menu.path), yaml.stringify(_themeConfigMenu, 6), 'utf8');
  }
  // 判断是否要克隆
  if (readerConfig.clone.enable) {
    cloneDataArr = await getConfigData('clone');
    if (!Array.isArray(cloneDataArr)) {
      cloneDataArr = [cloneDataArr];
    }
    while (cloneDataArr) {
      const cloneData = cloneDataArr.shift();
      const beforeUrlArr = [cloneData.host]; const afterUrlArr = []; const errlinkTotal = [];let pageTotal=0
      const sleep = function(s) {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve(true);
          }, s + Math.random() * s);
        });
      };
      while (beforeUrlArr.length) {
        const url = beforeUrlArr.shift();
        afterUrlArr.push(url);
        const {listUrl, articleData, errlink} = await butterfly({
          ...cloneData, url
        });
        // 去重合并
        while (listUrl.length) {
          const item = listUrl.shift();
          if (afterUrlArr.indexOf(item) < 0 && beforeUrlArr.indexOf(item) < 0) {
            beforeUrlArr.push(item);
          }
        }
        // 判断是否是文章
        if (util.isObject(articleData)) {
          del.sync([_config.source_dir + '/_posts/' + cloneData.output + articleData.item.categories.join('/') + '/*.md']);
          _this.config.new_post_name = cloneData.output + articleData.item.categories.join('/') + '/:title.md';
          await _this.post.create(articleData.item);
          pageTotal++
          console.log(colors.cyan('生成一条，当前第'+pageTotal+'条：' + articleData.link));
        }
        // 判断当前是否请求失败
        if (errlink) {
          errlinkTotal.push({
            link: errlink,
            num: errlinkTotal.indexOf(errlink) < 0 ? 1 : errlinkTotal[errlinkTotal.indexOf(errlink)] + 1
          });
        }
        // 延时抓取
        if (cloneData.waittime !== 0) {
          await sleep(cloneData.waittime || 500);
        }
      }
      console.log(colors.cyan('网站总链接：'+ afterUrlArr.length + '个；已克隆文章：'+pageTotal+'个。'));
      console.log(colors.cyan('请求失败统计：'), errlinkTotal);
    }
  }
};

