const moment = require('moment');
const request = require('request-promise');
const md2json = require('md2json');

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
            '.md',
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
 * Collects the nav and append it to the resource
 * @param {RequestContext} ctx Context
 */
function collectNav(ctx) {
    const params = {
        org: ctx.strainConfig.urls.content.owner,
        repo: ctx.strainConfig.urls.content.repo,
        tree: ctx.strainConfig.urls.content.ref,
        path: 'SUMMARY.md'
    };

    return md2json.main(params).then(info => {
        let nav = info.body.children;
        // remove first title
        delete nav[0];

        // link re-writing
        // TODO: move into md2json + parameters
        ctx.resource.nav = nav.map(element => {
            return element.replace(new RegExp('href="', 'g'), 'href="/' + ctx.strain + '/');
        });
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
        .then(collectNav)
        .catch(error => {
            console.error('Error while executing default.pre.js', error);
        });
};
