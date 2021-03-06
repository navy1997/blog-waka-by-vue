'use strict';

require('./check-versions')();

let config = require('../config');
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = JSON.parse(config.dev.env.NODE_ENV)
}

const opn = require('opn');
const path = require('path');
const express = require('express');
const webpack = require('webpack');
let proxyMiddleware = require('http-proxy-middleware'); // http 代理中间件
let webpackConfig = process.env.NODE_ENV === 'testing'
  ? require('./webpack.prod.conf')
  : require('./webpack.dev.conf');

// default port where dev server listens for incoming traffic
let port = process.env.PORT || config.dev.port;
// automatically open browser, if not set will be false
let autoOpenBrowser = config.dev.autoOpenBrowser;
// Define HTTP proxies to your custom API backend
// https://github.com/chimurai/http-proxy-middleware
let proxyTable = config.dev.proxyTable;

let app = express();
let compiler = webpack(webpackConfig);


/************************************************上方部分是vue-cli生成*********************************************/


/*^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ 引入模块 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^*/


/*---------------------node 模块-----------------*/


const fs = require('fs');   // 因为要读取.md文件，所以引入文件读取模块fs
const bodyParser = require('body-parser');  // 引入body-parser解析请求过来的数据
const blogWakaRouter = express.Router();  // 定义Express的路由，并编写接口
const session = require('express-session'); // Since version 1.5.0, the cookie-parser middleware no longer needs to be used for this module to work. https://github.com/expressjs/session


/*---------------------数据库相关-----------------*/


const mongoose = require('mongoose'); // 引入mongoose连接数据库
const info = require('../info.json'); // 引入info.json，这里面存有管理员账号密码和mongodb账号密码

// 引入mongoose的model
const Article = require('../models/article');  // 引入Article Model
const Type = require('../models/type');  // 引入Type Model
const User = require('../models/user'); // 引入User Model


/*---------------------Vue2 history模式-----------------*/


const history = require('connect-history-api-fallback');  // HTML5 History 模式
const connect = require('connect'); // HTML5 History 模式


/*^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ node操作和引入中间件 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^*/


// 连接数据库
mongoose.connect('mongodb://localhost/blogWaka');


/*----------------------使用中间件----------------*/


app.use(bodyParser.json()); // 使用bodyParser将req.body解析成json，要不然是undefined
app.use('/blogWaka', blogWakaRouter); // 使用该路由；所有的路由都要加上/blogWaka，举个栗子：localhost:8080/blogWaka/articles
app.use(history()); // HTML5 History 模式

// 服务器保存用户状态
// name: 设置 cookie 中保存 session id 的字段名称，默认为connect.sid; secret: 通过设置 secret 来计算 hash 值并放在 cookie 中，使产生的 signedCookie 防篡改; resave: 如果为true，则每次请求都重新设置session的 cookie，假设你的cookie是10分钟过期，每次请求都会再设置10分钟; saveUninitialized: 如果为true, 则无论有没有session的cookie，每次请求都设置个session cookie
app.use(session({
  secret: 'waka',
  resave: false,
  saveUninitialized: true
}));


/*^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ 全局函数 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^*/


/**
 * 错误处理函数
 * @param res
 * @param err
 */
function handleError(res, err) {
  console.log(err);
  res.json({
    errorCode: err.code,
    data: err.message
  });
}


/*^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ 路由配置 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^*/


/*-----------------------------文章相关----------------------------*/

// 请求所有文章
blogWakaRouter.get('/articles', function (req, res) {

  // console.log('user in session: ');
  // console.log(req.session.user);

  Article.fetch(function (err, articles) {
    if (err) {
      handleError(err);
      return;
    }
    // 处理数据
    articles = articles.map(function (article) {
      article.content = ''; // 删除content字段用来减少网络传输的字节，content详情页再获取
      return article;
    });
    res.json({
      errorCode: 0,
      data: articles
    });
  });
});

// 请求具体的某一篇文章
blogWakaRouter.get('/articleDetail/:id', function (req, res) {
  let id = req.params.id;
  console.log('id = ' + id);

  Article.findById(id, function (err, article) {
    if (err) {
      handleError(err);
      return;
    }
    res.json({
      errorCode: 0,
      data: article
    });
  });
});

// 根据类型请求文章
blogWakaRouter.get('/articleList/:typeId', function (req, res) {
  let typeId = req.params.typeId;
  console.log('typeId = ' + typeId);

  Article.findByTypeId(typeId, function (err, articles) {
    if (err) {
      handleError(err);
      return;
    }
    res.json({
      errorCode: 0,
      data: articles
    });
  });
});

// admin post article 后台添加文章接口
blogWakaRouter.post('/admin/article/new', function (req, res) {
  console.log('后台添加文章接口 /admin/article/new body = ' + req.body);

  let article = req.body.article;
  let id = article._id;

  // 判断是否是添加新的数据还是更新旧的数据
  if (id === undefined) {
    // 新数据添加
    let articleTemp = new Article({ // 调用构造方法构造model
      title: article.title,
      intro: article.intro,
      link: article.link,
      typeId: article.typeId,
      typeName: article.typeName,
      img: article.img,
      content: article.content
    });
    articleTemp.save(function (err, article) {  // 保存至数据库
      if (err) {
        handleError(err);
        return;
      }
      res.json({
        errorCode: 0,
        data: '添加成功',
        articleId: article._id
      });
    });
  } else {
    console.log('更新数据');
    article.meta.updateAt = Date.now();
    // 旧数据更新
    Article.findOneAndUpdate({_id: id}, article, function (err, article) {
      if (err) {
        handleError(err);
        return;
      }
      res.json({
        errorCode: 1,
        data: '更新成功',
        articleId: article._id
      });
    });
  }
});

// 删除文章
blogWakaRouter.post('/admin/deleteArticle', function (req, res) {
  let articleId = req.body.articleId;
  console.log('删除文章 articleId = ' + articleId);

  Article.remove({_id: articleId}, function (err, article) {
    if (err) {
      handleError(err);
      return;
    }
    res.json({
      errorCode: 0,
      data: '删除成功'
    });
  });
});

/*-----------------------------类型相关----------------------------*/

// 请求所有类型
blogWakaRouter.get('/types', function (req, res) {
  Type.fetch(function (err, types) {
    if (err) {
      handleError(err);
      return;
    }
    res.json({
      errorCode: 0,
      data: types
    });
  });
});

// admin post type 后台添加类型接口
blogWakaRouter.post('/admin/type/new', function (req, res) {
  console.log(req.body);

  let typePost = req.body.type;
  let typeName = typePost.typeName;
  let id = typePost._id;

  Type.findByTypeName(typeName, function (err, type) {
    if (err) {
      handleError(err);
      return;
    }
    console.log(type);
    // type === null 说明该类型数据库里没有，可以添加
    if (type === null) {
      // 新数据添加
      let typeTemp = new Type({ // 调用构造方法构造model
        typeName: typePost.typeName
      });
      typeTemp.save(function (err, type) {  // 保存至数据库
        if (err) {
          handleError(err);
          return;
        }
        res.json({
          errorCode: 0,
          data: '添加成功',
          typeId: type._id
        });
      });
    }
    // 数据库里有了该类型，不可以再添加
    else {
      res.json({
        errorCode: -1,
        data: '已有该类型'
      });
    }
  });
});

/*-----------------------------用户相关----------------------------*/

// 登录接口
blogWakaRouter.post('/login', function (req, res) {
  console.log(req.body);

  let username = req.body.username;
  let password = req.body.password;

  // 查询
  User.findOne({
    username: username
  }, function (err, user) {

    if (err) {
      handleError(res, err);
      return;
    }

    if (!user) {
      res.json({
        errorCode: 1,
        data: '用户不存在'
      });
      return;
    }

    // 比较密码
    user.comparePassword(password, function (err, isMatch) {
      if (err) {
        handleError(res, err);
        return;
      }

      if (!isMatch) {
        res.json({
          errorCode: 2,
          data: '密码不正确'
        });
        return;
      }

      // req.session.user = user;  // 把用户信息保存在session里
      res.json({
        errorCode: 0,
        data: '登录成功'
      });
    });
  });
});

// 注册接口
blogWakaRouter.post('/signUp', function (req, res) {
  console.log('注册接口 /signUp');
  console.log(req.body);

  let username = req.body.username;
  let password = req.body.password;

  let user = new User({
    username: username,
    password: password
  });

  // 保存到数据库里
  user.save(function (err, user) {
    if (err) {
      if (err.code === 11000) { // 如果错误码是11000，则代表数据库中已有该值，修改提示语
        err.message = '该用户已注册';
      }
      handleError(res, err);
      return;
    }

    res.json({
      errorCode: 0,
      data: '注册成功'
    });
  });

});

// 获得所有用户接口
blogWakaRouter.get('/admin/userList', function (req, res) {
  User.fetch(function (err, users) {
    let data;
    if (err) {
      console.log(err);
      data = err.message;
    } else {
      data = users;
    }
    res.json({
      errorCode: 0,
      data: data
    });
  });
});


/*********************************************下方部分是vue-cli生成*************************************************/


let devMiddleware = require('webpack-dev-middleware')(compiler, {
  publicPath: webpackConfig.output.publicPath,
  quiet: true
});

let hotMiddleware = require('webpack-hot-middleware')(compiler, {
  log: () => {
  }
});
// force page reload when html-webpack-plugin template changes
compiler.plugin('compilation', function (compilation) {
  compilation.plugin('html-webpack-plugin-after-emit', function (data, cb) {
    hotMiddleware.publish({action: 'reload'});
    cb()
  })
});

// proxy api requests
Object.keys(proxyTable).forEach(function (context) {
  let options = proxyTable[context];
  if (typeof options === 'string') {
    options = {target: options}
  }
  app.use(proxyMiddleware(options.filter || context, options))
});

// handle fallback for HTML5 history API
app.use(require('connect-history-api-fallback')());

// serve webpack bundle output
app.use(devMiddleware);

// enable hot-reload and state-preserving
// compilation error display
app.use(hotMiddleware);

// serve pure static assets
let staticPath = path.posix.join(config.dev.assetsPublicPath, config.dev.assetsSubDirectory);
app.use(staticPath, express.static('./static'));

let uri = 'http://localhost:' + port;

devMiddleware.waitUntilValid(function () {
  console.log('> Listening at ' + uri + '\n')
});


module.exports = app.listen(port, function (err) {
  if (err) {
    console.log(err);
    return
  }

  // when env is testing, don't need open it
  if (autoOpenBrowser && process.env.NODE_ENV !== 'testing') {
    opn(uri)
  }
});
