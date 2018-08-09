
const KEYS_TO_REMOVE = ['position'];

function removePosition(node) {
  if (node && typeof node === 'object') {
    const keys = Object.keys(node);
    keys.forEach((k) => {
      if (KEYS_TO_REMOVE.indexOf(k) !== -1) {
        delete node[k];
      } else {
        removePosition(node[k]);
      }
    });
  }
}

// module.exports.pre is a function (taking next as an argument)
// that returns a function (with payload, secrets, logger as arguments)
// that calls next (after modifying the payload a bit)
function pre(next) {
  return async function process(payload, secrets, logger) {
    try {
      const p = payload;

      delete p.resource.body;
      delete p.resource.html;

      removePosition(p.resource.mdast);
      removePosition(p.resource.htast);

      let jsonStr = JSON.stringify(p);
      p.json = jsonStr;

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