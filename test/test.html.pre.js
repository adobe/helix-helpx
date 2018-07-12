/*
 * Copyright 2018 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* global describe, it */
const assert = require('assert');
const nock = require('nock');
const defaultPre = require('../src/html.pre.js');

const loggerMock = {
  log: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  silly: () => {},
};

describe('Testing pre requirements for main function', () => {
  it('Exports pre', () => {
    assert.ok(defaultPre.pre);
  });

  it('pre is a function', () => {
    assert.equal('function', typeof defaultPre.pre);
  });

  it('pre returns next', (done) => {
    /* eslint no-unused-vars: "off" */
    const next = (payload, secrets, logger) => done();
    const ret = defaultPre.pre(next)({}, {}, loggerMock);
    assert.equal('function', typeof ret.then);
    ret.then({ payload: {}, secrets: {}, logger: loggerMock });
  });
});

function emptyPayloadIT(fct) {
  it('Empty payload should not trigger an exception', (done) => {
    fct({ payload: {}, secrets: {}, logger: loggerMock })
      .then(() => done()).catch(error => done(error));
  });
}

describe('Testing setContextPath', () => {
  // TODO adjust when method is removed
  emptyPayloadIT(defaultPre.setContextPath);
});

describe('Testing removeFirstTitle', () => {
  emptyPayloadIT(defaultPre.removeFirstTitle);

  it('Empty children', (done) => {
    defaultPre.removeFirstTitle({
      payload: {
        resource: {
          children: [],
        },
      },
      secrets: {},
      logger: loggerMock,
    }).then(({ payload, secrets, logger }) => {
      assert.deepEqual(payload.resource.children, []);
      done();
    }).catch(error => done(error));
  });

  it('Remove first child', (done) => {
    defaultPre.removeFirstTitle({
      payload: {
        resource: {
          children: ['a', 'b', 'c'],
        },
      },
      secrets: {},
      logger: loggerMock,
    }).then(({ payload, secrets, logger }) => {
      assert.deepEqual(payload.resource.children, ['b', 'c']);
      done();
    }).catch(error => done(error));
  });
});

describe('Testing collectMetadata', () => {
  emptyPayloadIT(defaultPre.collectMetadata);

  it('Collect metadata', (done) => {
    const expectedMetadata = {
      p1: 1,
      p2: 2,
    };
    nock('http://localhost').get('/repos/owner/repo/commits?path=resourcePath.md&sha=ref').reply(200, expectedMetadata);

    defaultPre.collectMetadata({
      payload: {
        owner: 'owner',
        repo: 'repo',
        ref: 'ref',
        path: 'resourcePath.md',
        resource: {
          children: ['a', 'b', 'c'],
        },
      },
      secrets: {
        REPO_API_ROOT: 'http://localhost/',
      },
      logger: loggerMock,
    }).then(({ payload, secrets, logger }) => {
      assert.deepEqual(payload.resource.metadata, expectedMetadata);
      done();
    }).catch(error => done(error));
  });
});

describe('Testing extractCommittersFromMetadata', () => {
  emptyPayloadIT(defaultPre.extractCommittersFromMetadata);

  it('Extract committers', (done) => {
    defaultPre.extractCommittersFromMetadata({
      payload: {
        resource: {
          metadata: [{
            author: {
              avatar_url: 'a1_url',
              email: 'a1_email',
              name: 'a1',
            },
          }, {
            author: {
              avatar_url: 'a2_url',
              email: 'a2_email',
              name: 'a2',
            },
          }, {
            author: {
              avatar_url: 'a2_url',
              email: 'a2_email_different',
              name: 'a2_different',
            },
          }],
        },
      },
      secrets: {},
      logger: loggerMock,
    }).then(({ payload, secrets, logger }) => {
      assert.deepEqual(payload.resource.committers, [{
        avatar_url: 'a1_url',
        display: 'a1 | a1_email',
      }, {
        avatar_url: 'a2_url',
        display: 'a2 | a2_email',
      }]);
      done();
    }).catch(error => done(error));
  });
});

describe('Testing extractLastModifiedFromMetadata', () => {
  emptyPayloadIT(defaultPre.extractLastModifiedFromMetadata);

  it('Extract last modified', (done) => {
    defaultPre.extractLastModifiedFromMetadata({
      payload: {
        resource: {
          metadata: [{
            commit: {
              author: {
                name: 'a1',
                date: '01 Jan 2018 00:01:00 GMT',
              },
            },
          }, {
            author: {
              commit: {
                name: 'a2',
                date: '01 Jan 2018 00:00:00 GMT',
              },
            },
          }],
        },
      },
      secrets: {},
      logger: loggerMock,
    }).then(({ payload, secrets, logger }) => {
      assert.equal(payload.resource.lastModified.raw, '01 Jan 2018 00:01:00 GMT');
      done();
    }).catch(error => done(error));
  });
});

describe.only('Testing collectNav', () => {
  emptyPayloadIT(defaultPre.collectNav);

  it('Collect nav', (done) => {
    nock('http://localhost').get('/owner/repo/ref/SUMMARY.md').reply(200, '# Table of contents\n\n* a\n* b\n* [link](link.md)');

    defaultPre.collectNav({
      payload: {
        owner: 'owner',
        repo: 'repo',
        ref: 'ref',
        contextPath: '/',
        resource: {},
      },
      secrets: {
        REPO_RAW_ROOT: 'http://localhost/',
      },
      logger: loggerMock,
    }).then(({ payload, secrets, logger }) => {
      assert.deepEqual(payload.resource.nav[1], '<ul>\n<li>a</li>\n<li>b</li>\n<li><a href="/link.html">link</a></li>\n</ul>');
      done();
    }).catch(error => done(error));
  });
});
