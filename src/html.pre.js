const request = require('request-promise');
const { pipe } = require('@adobe/hypermedia-pipeline/src/defaults/html.pipe.js');

/**
 * Removes the first title from the resource children
 * @param Array children Children
 * @param {Object} logger Logger
 */
function removeFirstTitle(children, logger) {
  logger.debug('html-pre.js - Removing first title');
  let ret = children;
  if (ret && ret.length > 0) {
    ret = ret.slice(1);
  }
  return ret;
}

/**
 * Fetches the commits history
 * @param String apiRoot API root url
 * @param String owner Owner
 * @param String repo Repo
 * @param String ref Ref
 * @param String path Path to the resource
 * @param {Object} logger Logger
 */
async function fetchCommitsHistory(apiRoot, owner, repo, ref, path, logger) {
  logger.debug('html-pre.js - Fetching the commits history');

  const options = {
    uri:
      `${apiRoot}` +
      'repos/' +
      `${owner}` +
      '/' +
      `${repo}` +
      '/commits?path=' +
      `${path}` +
      '&sha=' +
      `${ref}`,
    headers: {
      'User-Agent': 'Request-Promise',
    },
    json: true,
  };

  logger.debug(`html-pre.js - Fetching... ${options.uri}`);
  return request(options);
}

/**
 * Extracts some committers data from the list of commits
 * and returns the list of committers
 * @param Array commits Commits
 * @param {Object} logger Logger
 */
function extractCommittersFromCommitsHistory(commits, logger) {
  logger.debug('html-pre.js - Extracting committers from metadata');
  if (commits) {
    const committers = [];

    commits.forEach((entry) => {
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

  logger.debug('html-pre.js - No committers found!');
  return [];
}

/**
 * Extracts the last modified date of commits and
 * returns an object containing the date details
 * @param Array commits Commits
 * @param {Object} logger Logger
 */
function extractLastModifiedFromCommitsHistory(commits, logger) {
  logger.debug('html-pre.js - Extracting last modified from metadata');

  if (commits) {
    const lastMod = commits.length > 0
      && commits[0].commit
      && commits[0].commit.author ? commits[0].commit.author.date : null;

    const display = new Date(lastMod);

    const lastModified = {
      raw: lastMod,
      display: lastMod ? display : 'Unknown',
    };
    logger.debug(`html-pre.js - Managed to fetch a last modified: ${display}`);
    return lastModified;
  }

  logger.debug('html-pre.js - No last modified found!');
  return {
    raw: 'Unknown',
    display: 'Unknown',
  };
}

/**
 * Returns that nav items based on the nav children
 * @param Array navChildren Children of the nav
 * @param {Object} logger Logger
 */
function extractNav(navChildren, logger) {
  logger.debug('html-pre.js - Extracting nav');

  if (navChildren) {
    let nav = navChildren;

    // remove first title
    if (nav && nav.length > 0) {
      nav = nav.slice(1);
    }
    nav = nav.map(element => element
      .replace(new RegExp('href="', 'g'), 'href="/')
      .replace(new RegExp('.md"', 'g'), '.html"'));

    logger.debug('html-pre.js - Managed to collect some content for the nav');
    return nav;
  }

  logger.debug('html-pre.js - Navigation payload has no children');
  return [];
}

/**
 * Fetches the nav payload
 * @param String rawRoot Raw root url
 * @param String owner Owner
 * @param String repo Repo
 * @param String ref Ref
 * @param {Object} logger Logger
 */
async function fetchNavPayload(owner, repo, ref, logger) {
  logger.debug('html-pre.js - Fectching the nav');

  const params = {
    owner,
    repo,
    ref,
    path: 'SUMMARY.md',
  };

  return pipe(null, {}, { request: { params }});
}

// module.exports.pre is a function (taking next as an argument)
// that returns a function (with payload, config, logger as arguments)
// that calls next (after modifying the payload a bit)
async function pre(payload, action) {
  const { logger, secrets, request: actionReq } = action;

  try {
    if (!payload.resource) {
      logger.debug('html-pre.js - Payload has no resource, nothing we can do');
      return payload;
    }

    const p = payload;

    // clean up the resource
    p.resource.children = removeFirstTitle(p.resource.children, logger);

    // extract committers info and last modified based on commits history
    if (secrets.REPO_API_ROOT) {
      p.resource.commits =
        await fetchCommitsHistory(
          secrets.REPO_API_ROOT,
          actionReq.params.owner,
          actionReq.params.repo,
          actionReq.params.ref,
          actionReq.params.path,
          logger,
        );
      p.resource.committers = extractCommittersFromCommitsHistory(p.resource.commits, logger);
      p.resource.lastModified = extractLastModifiedFromCommitsHistory(p.resource.commits, logger);
    } else {
      logger.debug('html-pre.js - No REPO_API_ROOT provided');
    }

    // fetch and inject the nav
    if (secrets.REPO_RAW_ROOT) {
      const navPayload =
        await fetchNavPayload(
          actionReq.params.owner,
          actionReq.params.repo,
          actionReq.params.ref,
          logger,
        );
      p.resource.nav = extractNav(navPayload.resource.children, logger);
    } else {
      logger.debug('html-pre.js - No REPO_RAW_ROOT provided');
    }

    return p;
  } catch (e) {
    logger.error(`Error while executing html.pre.js: ${e.stack || e}`);
    return {
      error: e,
    };
  }
}

module.exports.pre = pre;

// required only for testing
module.exports.removeFirstTitle = removeFirstTitle;
module.exports.fetchCommitsHistory = fetchCommitsHistory;
module.exports.extractCommittersFromCommitsHistory = extractCommittersFromCommitsHistory;
module.exports.extractLastModifiedFromCommitsHistory = extractLastModifiedFromCommitsHistory;
module.exports.fetchNavPayload = fetchNavPayload;
module.exports.extractNav = extractNav;
