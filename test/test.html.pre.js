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

describe('Testing pre requirements for main function', () => {
  it('Exports pre', () => {
    assert.ok(defaultPre.pre);
  });

  it('pre is a function', () => {
    assert.equal('function', typeof defaultPre.pre);
  });

  it('pre returns a Promise', () => {
    const ret = defaultPre.pre({});
    assert.equal('function', typeof ret.then);
  });
});

function emptyContextIT(fct) {
  it('Empty context should not trigger exception', (done) => {
    fct({}).then(() => done()).catch(error => done(error));
  });
}

describe('Testing setContextPath', () => {
  emptyContextIT(defaultPre.setContextPath);

  it('Strain defines the context path', (done) => {
    const expectedContextPath = 'strainDefinesContextPath';

    defaultPre.setContextPath({
      strain: expectedContextPath,
    }).then((ctx) => {
      assert(ctx.resource.contextPath, expectedContextPath);
      done();
    }).catch(error => done(error));
  });
});

describe('Testing removeFirstTitle', () => {
  emptyContextIT(defaultPre.removeFirstTitle);

  it('Empty children', (done) => {
    defaultPre.removeFirstTitle({
      resource: {
        children: [],
      },
    }).then((ctx) => {
      assert.deepEqual(ctx.resource.children, []);
      done();
    }).catch(error => done(error));
  });

  it('Remove first child', (done) => {
    defaultPre.removeFirstTitle({
      resource: {
        children: ['a', 'b', 'c'],
      },
    }).then((ctx) => {
      assert.deepEqual(ctx.resource.children, ['b', 'c']);
      done();
    }).catch(error => done(error));
  });
});

describe('Testing collectMetadata', () => {
  emptyContextIT(defaultPre.collectMetadata);

  it('Collect metadata', (done) => {
    const expectedMetadata = {
      p1: 1,
      p2: 2,
    };
    nock('http://localhost').get('/repos/owner/repo/commits?path=resourcePath.md&sha=ref').reply(200, expectedMetadata);

    defaultPre.collectMetadata({
      resource: {},
      resourcePath: 'resourcePath',
      strainConfig: {
        urls: {
          content: {
            apiRoot: 'http://localhost',
            owner: 'owner',
            repo: 'repo',
            ref: 'ref',
          },
        },
      },
    }).then((ctx) => {
      assert.deepEqual(ctx.resource.metadata, expectedMetadata);
      done();
    }).catch(error => done(error));
  });
});

describe('Testing collectNav', () => {
  emptyContextIT(defaultPre.collectNav);

  it('Collect nav', (done) => {
    nock('http://localhost').get('/owner/repo/ref/SUMMARY.md').reply(200, '# Table of contents\n\n* a\n* b\n* [link](link.md)');

    defaultPre.collectNav({
      resource: {},
      strain: 'strain',
      strainConfig: {
        urls: {
          content: {
            rawRoot: 'http://localhost',
            owner: 'owner',
            repo: 'repo',
            ref: 'ref',
          },
        },
      },
    }).then((ctx) => {
      assert.deepEqual(ctx.resource.nav[0], '<ul>\n<li>a</li>\n<li>b</li>\n<li><a href="/strain/link.md">link</a></li>\n</ul>');
      done();
    }).catch(error => done(error));
  });
});

describe('Testing extractCommittersFromMetadata', () => {
  emptyContextIT(defaultPre.extractCommittersFromMetadata);

  it('Extract committers', (done) => {
    defaultPre.extractCommittersFromMetadata({
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
    }).then((ctx) => {
      assert.deepEqual(ctx.resource.committers, [{
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
  emptyContextIT(defaultPre.extractLastModifiedFromMetadata);

  it('Extract last modified', (done) => {
    defaultPre.extractLastModifiedFromMetadata({
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
    }).then((ctx) => {
      assert.equal(ctx.resource.lastModified.raw, '01 Jan 2018 00:01:00 GMT');
      done();
    }).catch(error => done(error));
  });
});
