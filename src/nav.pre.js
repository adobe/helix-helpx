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
 * Rewrites links in nav prefixing with strain context changing to .html
 * @param {RequestContext} ctx Context
 */
function rewriteLinks(ctx) {
    ctx.resource.children = ctx.resource.children.map(element => {
        return element.replace(new RegExp('(href=")(.*)(\.md")', 'g'), 'href="/' + ctx.strain + '/$2.html"');
        });
    return Promise.resolve(ctx);
};

module.exports.main = function (ctx) {
    ctx.resource = ctx.resource || {};
    
    return Promise.resolve(ctx)
        .then(setContextPath)
        .then(removeFirstTitle)
        .then(rewriteLinks)
        .catch(error => {
            console.error('Error while executing nav.pre.js', error);
        });
};
