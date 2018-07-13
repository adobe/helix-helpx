const request = require('request-promise');
const { pipe } = require('@adobe/hypermedia-pipeline/src/defaults/html.pipe.js');

/**
 * Appends the context path to the payload
 * @param {Object} payload Payload
 * @param {Object} secrets Secrets
 * @param {Object} logger Logger
 */
function setContextPath({ payload, secrets, logger }) {
  // TODO move one level up, this should be set somewhere else (Petridish or dispatch?)
  logger.debug('html-pre.js - Setting context path');
  const res = Object.assign(payload, {
    contextPath: '/',
  });
  return Promise.resolve({ payload: res, secrets, logger });
}

/**
 * Removes the first title from the resource children
 * @param {Object} payload Payload
 * @param {Object} secrets Secrets
 * @param {Object} logger Logger
 */
function removeFirstTitle({ payload, secrets, logger }) {
  logger.debug('html-pre.js - Removing first title');

  const res = Object.assign({}, payload);
  if (payload.resource) {
    let children = [];
    if (payload.resource.children && payload.resource.children.length > 0) {
      children = payload.resource.children.slice(1);
    }
    res.resource.children = children;
  } else {
    logger.debug('html-pre.js - Payload has no resource');
  }

  return Promise.resolve({ payload: res, secrets, logger });
}

/**
 * Collects the resource metadata and appends them to the resource
 * @param {Object} payload Payload
 * @param {Object} secrets Secrets
 * @param {Object} logger Logger
 */
function collectMetadata({ payload, secrets, logger }) {
  logger.debug('html-pre.js - Collecting metadata');

  if (!secrets.REPO_API_ROOT) {
    logger.debug('html-pre.js - No REPO_API_ROOT provided');
    return Promise.resolve({ payload, secrets, logger });
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
  return request(options).then((metadata) => {
    const res = Object.assign({}, payload);

    if (payload.resource) {
      res.resource.metadata = metadata;
      logger.debug('html-pre.js - Managed to fetch some metadata');
    } else {
      logger.debug('html-pre.js - Payload has no resource');
    }

    return Promise.resolve({ payload: res, secrets, logger });
  });
}

/**
 * Extracts some committers data from the list of commits and appends the list to the resource
 * @param {Object} payload Payload
 * @param {Object} secrets Secrets
 * @param {Object} logger Logger
 */
function extractCommittersFromMetadata({ payload, secrets, logger }) {
  logger.debug('html-pre.js - Extracting committers from metadata');

  const res = Object.assign({}, payload);

  if (payload.resource) {
    const metadata = payload.resource.metadata || [];
    const committers = [];

    metadata.forEach((commit) => {
      if (commit.author
        && committers.map(item => item.avatar_url).indexOf(commit.author.avatar_url) < 0) {
        committers.push({
          avatar_url: commit.author.avatar_url,
          display: `${commit.author.name} | ${commit.author.email}`,
        });
      }
    });
    res.resource.committers = committers;
    logger.debug(`html-pre.js - Nomber of committers extracted: ${committers.length}`);
  } else {
    logger.debug('html-pre.js - Payload has no resource');
  }

  return Promise.resolve({ payload: res, secrets, logger });
}

/**
 * Extracts the last modified data of the resource and appends it to the resource
 * @param {Object} payload Payload
 * @param {Object} secrets Secrets
 * @param {Object} logger Logger
 */
function extractLastModifiedFromMetadata({ payload, secrets, logger }) {
  logger.debug('html-pre.js - Extracting last modified from metadata');

  const res = Object.assign({}, payload);
  if (payload.resource) {
    const metadata = payload.resource.metadata || [];

    const lastMod = metadata.length > 0
      && metadata[0].commit
      && metadata[0].commit.author ? metadata[0].commit.author.date : null;

    const display = new Date(lastMod);

    res.resource.lastModified = {
      raw: lastMod,
      display: lastMod ? display : 'Unknown',
    };
    logger.debug(`html-pre.js - Managed to fetch a last modified: ${display}`);
  } else {
    logger.debug('html-pre.js - Payload has no resource');
  }

  return Promise.resolve({ payload: res, secrets, logger });
}


function collectNav({ payload, secrets, logger }) {
  logger.debug('html-pre.js - Collecting the nav');

  if (!secrets.REPO_RAW_ROOT) {
    logger.debug('html-pre.js - No REPO_RAW_ROOT provided');
    return Promise.resolve({ payload, secrets, logger });
  }

  const params = {
    url: secrets.REPO_RAW_ROOT,
    owner: payload.owner,
    repo: payload.repo,
    ref: payload.ref,
    path: 'SUMMARY.md',
  };

  const next = (navPayload, s, l) => {
    logger.debug('html-pre.js - Received nav');

    const res = Object.assign({}, payload);

    if (navPayload.resource) {
      let nav = navPayload.resource.children;
      // remove first title
      if (nav && nav.length > 0) {
        nav = nav.slice(1);
      }
      res.resource.nav = nav.map(element => element
        .replace(new RegExp('href="', 'g'), `href="${payload.contextPath}`)
        .replace(new RegExp('.md"', 'g'), '.html"'));

      logger.debug('html-pre.js - Managed to fetch some content for the nav');
    } else {
      logger.debug('html-pre.js - Navigation payload has no resource');
    }

    return Promise.resolve({ payload: res, secrets: s, logger: l });
  };
  return pipe(next, params, secrets, logger);
}

// module.exports.pre is a function (taking next as an argument)
// that returns a function (with payload, secrets, logger as arguments)
// that calls next (after modifying the payload a bit)
module.exports.pre = next => (payload, secrets, logger) => {
  try {
    return Promise.resolve({ payload, secrets, logger })
      .then(setContextPath)
      .then(removeFirstTitle)
      .then(collectMetadata)
      .then(extractCommittersFromMetadata)
      .then(extractLastModifiedFromMetadata)
      .then(collectNav)
      .catch((e) => {
        logger.error(`Error while during html.pre.js execution: ${e.stack || e}`);
        next({
          error: e,
        }, secrets, logger);
      })
      .then(({ payload: finalPayload }) => next(finalPayload, secrets, logger));
  } catch (e) {
    logger.error(`Error while executing html.pre.js: ${e.stack || e}`);
    return Promise.resolve({
      error: e,
    });
  }
};

// required for testing
module.exports.setContextPath = setContextPath;
module.exports.removeFirstTitle = removeFirstTitle;
module.exports.collectMetadata = collectMetadata;
module.exports.extractCommittersFromMetadata = extractCommittersFromMetadata;
module.exports.extractLastModifiedFromMetadata = extractLastModifiedFromMetadata;
module.exports.collectNav = collectNav;
