'use strict';

const request = require('request-promise');
const converter = require('rel-to-abs');
const fs = require('fs');
const index = fs.readFileSync('index.html', 'utf8');
const ResponseBuilder = require('./app/ResponseBuilder');
const Iconv = require('iconv').Iconv;

module.exports = function(app){
    app.get('/*', (req, res) => {
        const responseBuilder = new ResponseBuilder(res);
        
        const origionalUrl = req.originalUrl;
        const requestedUrl = req.params[0];
        const corsBaseUrl = '//' + req.get('host');
        
        console.info(req.protocol + '://' + req.get('host') + origionalUrl);
        
        if(requestedUrl == ''){
            res.send(index);
            return;
        }

        request({
            uri: requestedUrl,
            resolveWithFullResponse: true,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36'
            },
            encoding: null
        })
        .then(originResponse => {            
            let charset;
            if (originResponse.headers['content-type']) {
                if (originResponse.headers["content-type"].match(/charset=(.*)/) &&
                    originResponse.headers["content-type"].match(/charset=(.*)/)[1]) {
                    charset = originResponse.headers["content-type"].match(/charset=(.*)/)[1]
                }
                if (charset) {
                    const conv = new Iconv(charset, 'utf-8');
                    originResponse.body = conv.convert(originResponse.body).toString();
                }
            }
            responseBuilder
                .addHeaderByKeyValue('Access-Control-Allow-Origin', '*')
                .addHeaderByKeyValue('Access-Control-Allow-Credentials', false)
                .addHeaderByKeyValue('Access-Control-Allow-Headers', 'Content-Type')
                .addHeaderByKeyValue('X-Proxied-By', 'cors-container')
                .build(originResponse.headers);
            if(req.headers['rewrite-urls']){
                res.send(
                    converter
                        .convert(originResponse.body, requestedUrl)
                        .replace(requestedUrl, corsBaseUrl + '/' + requestedUrl)
                ); 
            }else{
                res.send(originResponse.body);                
            }
        })
        .catch(originResponse => {
            responseBuilder
                .addHeaderByKeyValue('Access-Control-Allow-Origin', '*')
                .addHeaderByKeyValue('Access-Control-Allow-Credentials', false)
                .addHeaderByKeyValue('Access-Control-Allow-Headers', 'Content-Type')
                .addHeaderByKeyValue('X-Proxied-By', 'cors-containermeh')
                .build(originResponse.headers);

            res.status(originResponse.statusCode || 500);
            
            return res.send(originResponse.message);
        });
    });
};
