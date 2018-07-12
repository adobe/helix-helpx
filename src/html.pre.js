const request = require('request-promise');

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

    res.resource.lastModified = {
      raw: lastMod,
      display: lastMod ? new Date(lastMod) : 'Unknown',
    };
  }

  return Promise.resolve({ payload: res, secrets, logger });
}


function collectNav({ payload, secrets, logger }) {
  logger.debug('html-pre.js - Collecting the nav');

  // TODO
  if (!secrets.REPO_RAW_ROOT) {
    return Promise.resolve({ payload, secrets, logger });
  }

  // const params = {
  //   url: secrets.REPO_RAW_ROOT,
  //   owner: payload.owner,
  //   repo: payload.repo,
  //   ref: payload.ref,
  //   path: 'SUMMARY.md',
  // };

  const res = Object.assign({}, payload);

  // return md2json.main(params).then((info) => {
  //   let nav = info.body.children;
  //   // remove first title
  //   if (nav && nav.length > 0) {
  //     nav = nav.slice(1);
  //   }

  // link re-writing
  // TODO: move into md2json + parameters
  // ctx.resource.nav =
  // nav.map(element => element.replace(new RegExp('href="', 'g'), `href="/${ctx.strain}/`));
  //  return Promise.resolve(ctx);
  // });

  return Promise.resolve({ payload: res, secrets, logger });
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
      // .then(collectNav)
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
