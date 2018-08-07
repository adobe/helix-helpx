const request = require('request-promise');
const { pipe } = require('@adobe/hypermedia-pipeline/src/defaults/html.pipe.js');

/* eslint no-param-reassign: off */

/**
 * Removes the first title from the resource children
 * @param {Object} payload Payload
 * @param {Object} logger Logger
 */
function removeFirstTitle(resource, logger) {
  logger.debug('html-pre.js - Removing first title');
  let children = [];
  if (resource.children && resource.children.length > 0) {
    children = resource.children.slice(1);
  }
  resource.children = children;
}

/**
 * Collects the resource metadata and appends them to the resource
 * @param {Object} payload Payload
 * @param {Object} secrets Secrets
 * @param {Object} logger Logger
 */
async function collectMetadata(payload, secrets, logger) {
  logger.debug('html-pre.js - Collecting metadata');

  if (!secrets.REPO_API_ROOT) {
    logger.debug('html-pre.js - No REPO_API_ROOT provided');
    return null;
  }

  const options = {
    uri:
      `${secrets.REPO_API_ROOT}` +
      'repos/' +
      `${payload.owner}` +
      '/' +
      `${payload.repo}` +
      '/commits?path=' +
      `${payload.path}` +
      '&sha=' +
      `${payload.ref}`,
    headers: {
      'User-Agent': 'Request-Promise',
    },
    json: true,
  };

  logger.debug(`html-pre.js - Fetching... ${options.uri}`);
  return request(options);
}

/**
 * Extracts some committers data from the list of commits and appends the list to the resource
 * @param {Object} payload Payload
 * @param {Object} logger Logger
 */
function extractCommittersFromMetadata(metadata, logger) {
  logger.debug('html-pre.js - Extracting committers from metadata');
  if (metadata) {
    const committers = [];

    metadata.forEach((entry) => {
      if (entry.author
        && entry.commit.author
        && committers.map(item => item.avatar_url).indexOf(entry.author.avatar_url) < 0) {
        committers.push({
          avatar_url: entry.author.avatar_url,
          display: `${entry.commit.author.name} | ${entry.commit.author.email}`,
        });
      }
    });
    logger.debug(`html-pre.js - Number of committers extracted: ${committers.length}`);
    return committers;
  }

  logger.debug('html-pre.js - No metadata found!');
  return null;
}

/**
 * Extracts the last modified data of the resource and appends it to the resource
 * @param {Object} payload Payload
 * @param {Object} logger Logger
 */
function extractLastModifiedFromMetadata(metadata, logger) {
  logger.debug('html-pre.js - Extracting last modified from metadata');

  if (metadata) {
    const lastMod = metadata.length > 0
      && metadata[0].commit
      && metadata[0].commit.author ? metadata[0].commit.author.date : null;

    const display = new Date(lastMod);

    const lastModified = {
      raw: lastMod,
      display: lastMod ? display : 'Unknown',
    };
    logger.debug(`html-pre.js - Managed to fetch a last modified: ${display}`);
    return lastModified;
  }

  logger.debug('html-pre.js - No metadata found!');
  return null;
}

function collectNav(navPayload, logger) {
  logger.debug('html-pre.js - Received nav');

  if (navPayload.resource) {
    let nav = navPayload.resource.children;

    // remove first title
    if (nav && nav.length > 0) {
      nav = nav.slice(1);
    }
    nav = nav.map(element => element
      .replace(new RegExp('href="', 'g'), 'href="/')
      .replace(new RegExp('.md"', 'g'), '.html"'));

    logger.debug('html-pre.js - Managed to fetch some content for the nav');
    return nav;
  }

  logger.debug('html-pre.js - Navigation payload has no resource');
  return null;
}

async function fetchNav(payload, secrets, logger) {
  logger.debug('html-pre.js - Collecting the nav');

  if (!secrets.REPO_RAW_ROOT) {
    logger.debug('html-pre.js - No REPO_RAW_ROOT provided');
    return null;
  }

  const params = {
    url: secrets.REPO_RAW_ROOT,
    owner: payload.owner,
    repo: payload.repo,
    ref: payload.ref,
    path: 'SUMMARY.md',
  };

  return pipe(null, params, secrets, logger);
}

// module.exports.pre is a function (taking next as an argument)
// that returns a function (with payload, secrets, logger as arguments)
// that calls next (after modifying the payload a bit)
function pre(next) {
  return async function process(payload, secrets, logger) {
    try {
      if (!payload.resource) {
        logger.debug('html-pre.js - Payload has no resource, nothing we can do');
        return next(payload, secrets, logger);
      }

      const p = payload;

      removeFirstTitle(p.resource, logger);
      p.resource.metadata = await collectMetadata(p, secrets, logger);
      p.resource.committers = extractCommittersFromMetadata(p.resource.metadata, logger);
      p.resource.lastModified = extractLastModifiedFromMetadata(p.resource.metadata, logger);

      const navPayload = await fetchNav(p, secrets, logger);
      p.resource.nav = collectNav(navPayload, logger);

      return next(p, secrets, logger);
    } catch (e) {
      logger.error(`Error while executing html.pre.js: ${e.stack || e}`);
      return {
        error: e,
      };
    }
  };
}

module.exports.pre = pre;

// required for testing
module.exports.removeFirstTitle = removeFirstTitle;
module.exports.collectMetadata = collectMetadata;
module.exports.extractCommittersFromMetadata = extractCommittersFromMetadata;
module.exports.extractLastModifiedFromMetadata = extractLastModifiedFromMetadata;
module.exports.fetchNav = fetchNav;
module.exports.collectNav = collectNav;
