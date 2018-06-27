const moment = require('moment');
const request = require('request-promise');
const md2json = require('@adobe/md2json');

/**
 * Appends the context path to the resource based on the strain
 * @param {RequestContext} ctx Context
 */
function setContextPath(ctx) {
  ctx.resource = ctx.resource || {};
  ctx.resource.contextPath = ctx.strain;
  return Promise.resolve(ctx);
}

/**
 * Removes the first title from the resource children
 * @param {RequestContext} ctx Context
 */
function removeFirstTitle(ctx) {
  ctx.resource = ctx.resource || {};
  if (ctx.resource.children && ctx.resource.children.length > 0) {
    ctx.resource.children = ctx.resource.children.slice(1);
  }
  return Promise.resolve(ctx);
}

/**
 * Collects the resource metadata and appends them to the resource
 * @param {RequestContext} ctx Context
 */
function collectMetadata(ctx) {
  ctx.resource = ctx.resource || {};

  if (!ctx.strainConfig) {
    return Promise.resolve(ctx);
  }

  const options = {
    uri:
      `${ctx.strainConfig.urls.content.apiRoot}` +
      '/repos/' +
      `${ctx.strainConfig.urls.content.owner}` +
      '/' +
      `${ctx.strainConfig.urls.content.repo}` +
      '/commits?path=' +
      `${ctx.resourcePath}.md` +
      '&sha=' +
      `${ctx.strainConfig.urls.content.ref}`,
    headers: {
      'User-Agent': 'Request-Promise',
    },
    json: true,
  };

  console.debug('Fetching...', options.uri);
  return request(options).then((metadata) => {
    ctx.resource.metadata = metadata;
    return Promise.resolve(ctx);
  });
}

/**
 * Collects the nav and append it to the resource
 * @param {RequestContext} ctx Context
 */
function collectNav(ctx) {
  ctx.resource = ctx.resource || {};

  if (!ctx.strainConfig) {
    return Promise.resolve(ctx);
  }

  const params = {
    owner: ctx.strainConfig.urls.content.owner,
    repo: ctx.strainConfig.urls.content.repo,
    ref: ctx.strainConfig.urls.content.ref,
    path: 'SUMMARY.md',
  };

  return md2json.main(params).then((info) => {
    const nav = info.body.children;
    // remove first title
    delete nav[0];

    // link re-writing
    // TODO: move into md2json + parameters
    ctx.resource.nav = nav.map(element => element.replace(new RegExp('href="', 'g'), `{href="/${ctx.strain}/'`));
    return Promise.resolve(ctx);
  });
}

/**
 * Extracts some committers data from the list of commits and appends the list to the resource
 * @param {RequestContext} ctx Context
 */
function extractCommittersFromMetadata(ctx) {
  ctx.resource = ctx.resource || {};
  const metadata = ctx.resource.metadata || [];
  const committers = [];

  metadata.forEach((commit) => {
    if (commit.author
      && committers.map(item => item.avatar_url).indexOf(commit.author.avatar_url) < 0) {
      committers.push({
        avatar_url: commit.author.avatar_url,
        display: `${commit.commit.author.name} | ${commit.commit.author.email}`,
      });
    }
  });

  ctx.resource.committers = committers;
  return Promise.resolve(ctx);
}

/**
 * Extracts the last modified data of the resource and appends it to the resource
 * @param {RequestContext} ctx Context
 */
function extractLastModifiedFromMetadata(ctx) {
  ctx.resource = ctx.resource || {};
  const metadata = ctx.resource.metadata || [];

  const lastMod = metadata.length > 0
    && metadata[0].commit
    && metadata[0].commit.author ? metadata[0].commit.author.date : null;

  ctx.resource.lastModified = {
    raw: lastMod,
    display: lastMod ? moment(lastMod).fromNow() : 'Unknown',
  };
  return Promise.resolve(ctx);
}

function main(ctx) {
  return Promise.resolve(ctx)
    .then(setContextPath)
    .then(removeFirstTitle)
    .then(collectMetadata)
    .then(extractCommittersFromMetadata)
    .then(extractLastModifiedFromMetadata)
    .then(collectNav)
    .catch((error) => {
      console.error('Error while executing default.pre.js', error);
    });
}

module.exports.main = main;
module.exports.setContextPath = setContextPath;
module.exports.removeFirstTitle = removeFirstTitle;
module.exports.collectMetadata = collectMetadata;
module.exports.collectNav = collectNav;
module.exports.extractCommittersFromMetadata = extractCommittersFromMetadata;
module.exports.extractLastModifiedFromMetadata = extractLastModifiedFromMetadata;
