'use strict';

const request = require('request-promise');
const converter = require('rel-to-abs');
const url = require('url');
const fs = require('fs');
const index = fs.readFileSync('index.html', 'utf8');
const debug = process.env.debug_log || false;

module.exports = function(app){
    function setHeaders(res, origin){
        if(debug) {
            console.info("setHeaders origin:" , JSON.stringify(origin.headers));  
        } 
        res.header(origin.headers);
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Credentials', false);
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        res.header('X-Proxied-By', 'cors-container');
    }

    app.get('/*', (req, res) => {
        let originalUrl = req.originalUrl;
        let requestedUrl = req.params[0];
        let parsedRequestUrl = url.parse(requestedUrl)
        let corsBaseUrl = '//' + req.get('host');
        
        console.info(req.protocol + '://' + req.get('host') + originalUrl);
        
        if(requestedUrl == ''){
            res.send(index);
            return;
        }        
        if(!parsedRequestUrl.host) {
            res.status(400);
            res.send("Invalid Url '" + requestedUrl + "'");
            return
        }
        
        req.headers['host'] = parsedRequestUrl.host;
        if(debug) {
            console.info("Req headers:" , JSON.stringify(req.headers));
        }

        request({
            uri: requestedUrl,
            resolveWithFullResponse: true,
            headers:  req.headers
        })
        .then(originResponse => {
            setHeaders(res, originResponse);

            if(req.headers['rewrite-urls']){
                res.send(
                    converter
                        .convert(originResponse.body, requestedUrl)
                            .replace(requestedUrl, corsBaseUrl + '/' + requestedUrl)); 
            }else{
                res.send(originResponse.body);                
            }
        })
        .catch(originResponse => {
            setHeaders(res, originResponse);
            
            res.status(originResponse.statusCode || 500);
            
            return res.send(originResponse.message);
        });
    });
};