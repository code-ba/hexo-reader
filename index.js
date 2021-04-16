/* global hexo */
'use strict';
hexo.extend.console.register('reader', '使用订阅器或者克隆整站文章', (options, callback) => require('./lib')(hexo, options, callback));
