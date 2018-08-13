const request = require('request-promise');
const { pipe } = require('@adobe/hypermedia-pipeline/src/defaults/html.pipe.js');

/**
 * Removes the first title from the resource children
 * @param {Object} resource Payload resource
 * @param {Object} logger Logger
 */
function removeFirstTitle(resource, logger) {
  const ret = resource;
  logger.debug('html-pre.js - Removing first title');
  let children = [];
  if (resource.children && resource.children.length > 0) {
    children = resource.children.slice(1);
  }
  ret.children = children;
  return ret;
}

/**
 * Collects the resource metadata and appends them to the resource
 * @param {Object} payload Payload
 * @param {Object} config Config
 * @param {Object} logger Logger
 */
async function collectMetadata(payload, config, logger) {
  logger.debug('html-pre.js - Collecting metadata');

  if (!config.REPO_API_ROOT) {
    logger.debug('html-pre.js - No REPO_API_ROOT provided');
    return null;
  }

  const options = {
    uri:
      `${config.REPO_API_ROOT}` +
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
 * Extracts some committers data from the list of commits (metadata)
 * and returns the list of committers
 * @param {Object} metadata metadata
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
 * Extracts the last modified date of commits (metadata) and
 * returns an object containing the date details
 * @param {Object} metadata Metadata
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

/**
 * Returns that nav items based on the nav payload
 * @param {Object} navPayload Nav payload
 * @param {Object} logger Logger
 */
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

/**
 * Fetches the nav payload
 * @param {Object} payload Current page payload
 * @param {Object} config Config
 * @param {Object} logger Logger
 */
async function fetchNav(payload, config, logger) {
  logger.debug('html-pre.js - Collecting the nav');

  if (!config.REPO_RAW_ROOT) {
    logger.debug('html-pre.js - No REPO_RAW_ROOT provided');
    return null;
  }

  const params = {
    url: config.REPO_RAW_ROOT,
    owner: payload.owner,
    repo: payload.repo,
    ref: payload.ref,
    path: 'SUMMARY.md',
  };

  return pipe(null, params, config, logger);
}

// module.exports.pre is a function (taking next as an argument)
// that returns a function (with payload, config, logger as arguments)
// that calls next (after modifying the payload a bit)
async function pre(payload, config) {
  const { logger } = config;

  try {
    if (!payload.resource) {
      logger.debug('html-pre.js - Payload has no resource, nothing we can do');
      return payload;
    }

    const p = payload;

    p.resource = removeFirstTitle(p.resource, logger);
    p.resource.metadata = await collectMetadata(p, config, logger);
    p.resource.committers = extractCommittersFromMetadata(p.resource.metadata, logger);
    p.resource.lastModified = extractLastModifiedFromMetadata(p.resource.metadata, logger);

    const navPayload = await fetchNav(p, config, logger);
    p.resource.nav = collectNav(navPayload, logger);

    return p;
  } catch (e) {
    logger.error(`Error while executing html.pre.js: ${e.stack || e}`);
    return {
      error: e,
    };
  }
}

module.exports.pre = pre;

// required for testing
module.exports.removeFirstTitle = removeFirstTitle;
module.exports.collectMetadata = collectMetadata;
module.exports.extractCommittersFromMetadata = extractCommittersFromMetadata;
module.exports.extractLastModifiedFromMetadata = extractLastModifiedFromMetadata;
module.exports.fetchNav = fetchNav;
module.exports.collectNav = collectNav;
