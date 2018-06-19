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

module.exports.main = function (ctx) {
    ctx.resource = ctx.resource || {};
    
    return Promise.resolve(ctx)
        .then(setContextPath)
        .then(removeFirstTitle)
        .catch(error => {
            console.error('Error while executing nav.pre.js', error);
        });
};
