/* eslint-disable strict */
const cheerio = require('cheerio');
const got = require('./got');
const listUrl = [];
async function createData(conf) {
  let articleData = null;
  const {url, host} = conf;

  const rule = {};
  rule.content = conf.rule && conf.rule.content || '$(\'[id="article-container"]\')';
  rule.title = conf.rule && conf.rule.title || '$(\'[property="og:title"]\').attr(\'content\')';
  rule.auther = conf.rule && conf.rule.auther || '$(\'[name="author"]\').attr(\'content\')';
  rule.description = conf.rule && conf.rule.description || '$(\'[name="description"]\').attr(\'content\')';
  rule.pubDate = conf.rule && conf.rule.pubDate || '$(\'[datetime].post-meta-date-created\').attr(\'datetime\')';
  rule.tags = conf.rule && conf.rule.tags || '$(\'.post-meta__tag-list a\')';
  rule.categories = conf.rule && conf.rule.categories || '$(\'.post-meta-categories a\')';
  rule.cover = conf.rule && conf.rule.cover || '$(\'[property="og:image"]\').attr(\'content\')';

  let res = null;
  try {
    res = await got.get(url);
  } catch (e) {
    console.log({e});
    return {
      errlink: url,
      listUrl,
      articleData
    };
  }
  const $ = cheerio.load(res.data);
  Array.from($('a[href]')).map(item => {
    let href = $(item).attr('href');
    if (typeof href === 'string') {
      href = href.trim().replace(/\/$/, '').trim();
      if (href.length && !/(^mailto:)|(tel:)|(javascript:)/.test(href)) {
        if (!/^http(|s):\/\//.test(href)) {
          href = host + (/^\//.test(href) ? href : '/' + href);
        }
        href = href.split('#')[0];
        if (href.indexOf(host) === 0) {
          listUrl.push(href);
        }
      }
    }
  });
  if (eval(rule.content).length) {
    const title = eval(rule.title);
    const auther = eval(rule.auther);
    const description = eval(rule.description);
    const content = eval(rule.content).html();
    const categories = [];
    const tags = [];
    Array.from(eval(rule.categories)).map(cg => {
      categories.push($(cg).text().replace('|', '').trim());
    });
    Array.from(eval(rule.tags)).map(tag => {
      tags.push($(tag).text().replace('|', '').trim());
    });
    const pubDate = eval(rule.pubDate);
    const cover = eval(rule.cover);
    articleData = {
      title,
      link: url,
      description,
      auther,
      item: {
        title,
        date: pubDate,
        link: url,
        categories,
        tags,
        cover,
        excerpt: description,
        content
      }
    };
  }
  return {
    listUrl,
    articleData,
    errlink: null
  };
}

module.exports = async getConfigData => {
  getConfigData.host.replace(/\/$/, '');
  getConfigData.url = getConfigData.url || getConfigData.host;
  return await createData(getConfigData);
};
