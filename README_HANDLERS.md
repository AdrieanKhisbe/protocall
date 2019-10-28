# protocall-handlers

:rotating_light: FIXME: to incorporate into main README

```javascript
const protocall = require('protocall');

const resolver = protocall.create();
resolver.use('path', protocall.handlers.path(__dirname));
resolver.use('file', protocall.handlers.file(__dirname));
resolver.use('base64', protocall.handlers.base64());
resolver.use('env', protocall.handlers.env());
resolver.use('require', protocall.handlers.require(__dirname));
resolver.use('exec', protocall.handlers.exec(__dirname));

resolver.resolve(require('./myfile'), function (err, data) {
    // data
});
```

## API
### shortop.handlers.path([basedir])

* `basedir` (*String*, optional) - The base path used for resolving relative path values. Defaults to `caller` dirname.

Creates a handler that can be given to protocall to resolve file paths.

```javascript
const foo = {
    "mydir": "path:./lib/dir"
};

const resolver = protocall.create();
resolver.use('path', shortop.handlers.path());
resolver.resolve(foo, function (err, data) {
  data.mydir; // `/path/to/my/project/lib/dir`
});
```



### shortop.handlers.file([basedir], [options])

* `basedir` (*String*, optional) - The base path used for resolving relative path values. Defaults to `caller` dirname.
* `options` (*Object*, optional) - Options object provided to fs.readFile.

Creates a handler which resolves the provided value to the basedir and returns the contents of the file as a Buffer.

```javascript
const foo = {
    "cert": "file:./cert.pem"
};

const resolver = protocall.create();
resolver.use('file', shortop.handlers.file());
resolver.resolve(foo, function (err, data) {
    foo.cert; // <Buffer 48 65 6c 6c 6f 2c 20 77 6f72 6c 64 21>
});
```


### shortop.handlers.base64()

Creates a handler which will return a buffer containing the content of the base64-encoded string.

```javascript
const foo = {
    "key": "base64:SGVsbG8sIHdvcmxkIQ=="
};

const resolver = protocall.create();
resolver.use('base64', shortop.handlers.base64());
resolver.resolve(foo, function (err, data) {
    data.key; // <Buffer 48 65 6c 6c 6f 2c 20 77 6f72 6c 64 21>
    data.key.toString('utf8'); // Hello, world!
});
```

### shortop.handlers.env()

Creates a handler which will resolve the provided value as an environment variable, optionally casting the value using the provided filter. Supported filters are '|d', '|b', and '|!b' which will cast to Number and Boolean types respectively.

```javascript
process.env.HOST = 'localhost';
process.env.PORT = '8000';
process.env.ENABLED = 'true';
process.env.FALSY = 'false'; // or '', or '0'

const foo = {
    "bar": "env:HOST",
    "baz": "env:PORT|d",
    "bam": "env:ENABLED|b",
    "bag": "env:FALSY|b"
    "bat": "env:FALSY|!b"
};

const resolver = protocall.create();
resolver.use('env', shortop.handlers.env());
resolver.resolve(foo, function (err, data) {
    data.bar; // 'localhost'
    data.baz; // 8000
    data.bam; // true
    data.bag; // false
    data.bat; // true
});
```


### shortop.handlers.require([basedir])

* `basedir` (*String*, optional) - The base path used for resolving relative path values. Defaults to `caller` dirname.

Creates a handler which resolves and loads, and returns the specified module.

```javascript
const foo = {
    "path": "require:path",
    "minimist": "require:minimist",
    "mymodule": "require:./mymodule"
    "json": "require:../config/myjson"
};

const resolver = protocall.create();
resolver.use('require', shortop.handlers.require());
resolver.resolve(foo, function (err, data) {
    data.path; // Node core `path` module
    data.minimist; // `minimist` module as loaded from node_modules
    data.mymodule; // module as loaded from `./mymodule.js`
    data.json; // JS object as loaded from `../config/myjson.json`
});
```


### shortop.handlers.exec([basedir])

* `basedir` (*String*, optional) - The base path used for resolving relative path values. Defaults to `caller` dirname.

Creates a handler which resolves and loads the specified module, executing the method (if specified) or the module itself, using the return value as the resulting value. The value should have the format `{module}(#{method})?`. If no function is able to be found this handler will throw with an error.
```javascript
const foo = {
    "item1": "exec:./mymodule#create"
    "item2": "exec:./myothermodule"
};

const resolver = protocall.create();
resolver.use('exec', shortop.handlers.exec(__dirname));
resolver.resolve(foo, function (err, data) {
    data.item1; // the result of calling mymodule.create()
    data.item2; // the result of calling myothermodule()
});
```



### shortop.handlers.glob([basedir|options])

* `basedir` (*String* or *Object*, optional) - The base path use for resolving or a `glob` options object per https://github.com/isaacs/node-glob#options

Creates a handler which match files using the patterns the shell uses.
```javascript
const foo = {
    "files": "glob:**/*.js"
};

const resolver = protocall.create();
resolver.use('glob', shortop.handlers.glob(__dirname));
resolver.resolve(foo, function (err, data) {
    data.files[0]; // '/my/dirname/foo/index.js';
    data.files[1]; // '/my/dirname/index.js';
});
```
