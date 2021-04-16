# hexo-reader
1. hexo博客的RSS阅读器
2. 整站文章克隆器，默认支持克隆主题`butterfly`的博客

## 安装
``` bash
npm install hexo-reader -D
```

## 指令
配置好后使用唯一指令生成、克隆
- `hexo reader`

## 配置
- 博客配置文件`_config.yml`
```yml
# reader：生成订阅/克隆网站
reader:
  rss:
    enable: true # 是否开启订阅功能，默认启用
    # 配置文件地址，支持本地文件 和 url
    # path: source/_data/rss.yml # 指定本地文件（如果未指定配置文件路径，默认读取这个文件）
    path: https://cdn.jsdelivr.net/gh/cxvh/cxvh@main/yml/rss.yml # 配置 url
  menu: # 非必须，以下为默认，会自动生成菜单，配置好后需要改下主题的导航；或者手动配置导航菜单
    path: source/_data/menu.yml # 标题文件地址
    icon: icon # 指定图标 name
    name: name # 指定标题 name
    url: url # 指定链接 name
  clone: # 克隆配置
    enable: false # 是否开启克隆功能，默认禁用
    # path: source/_data/clone.yml
    path: https://cdn.jsdelivr.net/gh/cxvh/cxvh@main/yml/clone.yml
```

- 订阅配置文件`source/_data/rss.yml`
```yml
- name: 图片 # 菜单名称
  categories: picture # 菜单英文
  class: fas fa-puzzle-piece fa-fw # 菜单图标 class
  list:
    - 百度趣画: https://rsshub.app/baidu/doodles
    - Google 相册: https://rsshub.app/google/album/msFFnAzKmQmWj76EA
    - CNU视觉联盟: https://rsshub.app/cnu/selected
    - NASA每日一天文圖: https://rsshub.app/nasa/apod-cn
- name: 设计
  categories: picture
  class: fas fa-magic fa-fw
  list:
    # 列表第一个没有标题直接链接，后面的风格需要保持一致
    - https://rsshub.app/uisdc/zt/design-history
    - https://rsshub.app/ui-cn/article
```

- 克隆配置文件`source/_data/clone.yml`
```yml
- name: BARAN的小站🔥🔥🔥
  host: https://cxvh.com # host 是必须的，入口文件
  output: Baran/ # 输出目录，非必须
  waittime: 0 # 链接请求间隔，默认 500，设置 0 无间隔容易出错
  rule: # 规则非必须，以下为默认规则
    content: $('#article-container') # 文章内容
    title: $('[property="og:title"]').attr('content') # 标题
    auther: $('[name="author"]').attr('content') # 作者
    subtitle: $('[name="description"]').attr('content') # 描述
    pubDate: $('[datetime].post-meta-date-created').attr('datetime') # 发布时间
    tags: $('.post-meta__tag-list a') # 标签
    categories: $('.post-meta-categories a') # 分类
    cover: $('[property="og:image"]').attr('content') # 封面
- name: butterfly主题
  host: https://butterfly.js.org
  output: butterfly/
  waittime: 500 # 等待时间 + 等待时间 × 随机数(0-1)
```

### 参考
- `npm`包地址：[hexo-reader](https://www.npmjs.com/package/hexo-reader)
- `github`源码地址：[https://github.com/code-ba/hexo-reader](https://github.com/code-ba/hexo-reader)
- 订阅站参考地址：[https://cxvh.cc](https://cxvh.cc)
- 克隆站参考地址：[https://butterfly.cxvh.cc](https://butterfly.cxvh.cc)

### 打赏
您的支持是我持续更新的动力！

<img src="https://cdn.jsdelivr.net/gh/cxvh/static@main/img/20210218193037.png" width="200" height="200" alt="微信">
<img src="https://cdn.jsdelivr.net/gh/cxvh/static@main/img/20210218192738.jpg" width="200" height="200" alt="支付宝">