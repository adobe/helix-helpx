const moment = require('moment');
const request = require('request-promise');

/**
 * Appends the context path to the resource based on the strain
 * @param {RequestContext} ctx Context
 */
function setContextPath(ctx) {
    ctx.resource.contextPath = ctx.strain;
    return Promise.resolve(ctx);
};

/**
 * Removes the first title from the resource children
 * @param {RequestContext} ctx Context
 */
function removeFirstTitle(ctx) {
    delete ctx.resource.children[0];
    return Promise.resolve(ctx);
};

/**
 * Collects the resource metadata and appends them to the resource
 * @param {RequestContext} ctx Context
 */
function collectMetadata(ctx) {
    const options = {
        uri:
            ctx.strainConfig.urls.content.apiRoot + 
            '/repos/' +
            ctx.strainConfig.urls.content.owner +
            '/' +
            ctx.strainConfig.urls.content.repo +
            '/commits?path=' + 
            ctx.resourcePath +
            '.md' +
            '&sha=' +
            ctx.strainConfig.urls.content.ref,
        headers: {
            'User-Agent': 'Request-Promise'
        },
        json: true
    };

    console.debug('Fetching...', options.uri);
    return request(options).then(metadata => {
        ctx.resource.metadata = metadata;
        return Promise.resolve(ctx);
    });
};

/**
 * Extracts some committers data from the list of commits and appends the list to the resource
 * @param {RequestContext} ctx Context
 */
function extractCommittersFromMetadata(ctx) {
    const metadata = ctx.resource.metadata || [];
    const committers = [];

    for (let i = 0; i < metadata.length; i++) {
        const commit = metadata[i];
        if (commit.author && committers.map(item => { return item.avatar_url; }).indexOf(commit.author.avatar_url) < 0) {
            committers.push({
                avatar_url: commit.author.avatar_url,
                display: commit.commit.author.name + ' | ' + commit.commit.author.email
            });
        }
    }

    ctx.resource.committers = committers;
    return Promise.resolve(ctx);
};

/**
 * Extracts the last modified data of the resource and appends it to the resource
 * @param {RequestContext} ctx Context
 */
function extractLastModifiedFromMetadata(ctx) {
    const metadata = ctx.resource.metadata || [];

    const lastMod = metadata.length > 0 && metadata[0].commit && metadata[0].commit.author ? metadata[0].commit.author.date : null;

    ctx.resource.lastModified = {
        'raw': lastMod,
        'display': lastMod ? moment(lastMod).fromNow() : 'Unknown'
    };
    return Promise.resolve(ctx);
;}

module.exports.main = function (ctx) {
    ctx.resource = ctx.resource || {};
    
    return Promise.resolve(ctx)
        .then(setContextPath)
        .then(removeFirstTitle)
        .then(collectMetadata)
        .then(extractCommittersFromMetadata)
        .then(extractLastModifiedFromMetadata)
        .catch(error => {
            console.error('Error while executing default.pre.js', error);
        });
};
