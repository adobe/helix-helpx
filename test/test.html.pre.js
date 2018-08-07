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

describe('Testing removeFirstTitle', () => {
  it('Empty children', () => {
    const resource = {
      children: [],
    };
    defaultPre.removeFirstTitle(resource, loggerMock);
    assert.deepEqual(resource.children, []);
  });

  it('Remove first child', () => {
    const resource = {
      children: ['a', 'b', 'c'],
    };
    defaultPre.removeFirstTitle(resource, loggerMock);
    assert.deepEqual(resource.children, ['b', 'c']);
  });
});

describe('Testing collectMetadata', () => {
  it('Empty payload should not trigger an exception', async () => {
    const metadata = await defaultPre.collectMetadata({}, {}, loggerMock);
    assert.equal(metadata, null);
  });

  it('Collect metadata', async () => {
    const expectedMetadata = {
      p1: 1,
      p2: 2,
    };
    nock('http://localhost').get('/repos/owner/repo/commits?path=resourcePath.md&sha=ref').reply(200, expectedMetadata);

    const metadata = await defaultPre.collectMetadata(
      {
        owner: 'owner',
        repo: 'repo',
        ref: 'ref',
        path: 'resourcePath.md',
        resource: {
          children: ['a', 'b', 'c'],
        },
      }, {
        REPO_API_ROOT: 'http://localhost/',
      },
      loggerMock,
    );

    assert.deepEqual(metadata, expectedMetadata);
  });
});

describe('Testing extractCommittersFromMetadata', () => {
  it('Extract committers', () => {
    const output = defaultPre.extractCommittersFromMetadata([{
      author: {
        avatar_url: 'a1_url',
      },
      commit: {
        author: {
          email: 'a1_email',
          name: 'a1',
        },
      },
    }, {
      author: {
        avatar_url: 'a2_url',
      },
      commit: {
        author: {
          email: 'a2_email',
          name: 'a2',
        },
      },
    }, {
      author: {
        avatar_url: 'a2_url',
      },
      commit: {
        author: {
          email: 'a2_email_different',
          name: 'a2_different',
        },
      },
    }], loggerMock);

    assert.deepEqual(output, [{
      avatar_url: 'a1_url',
      display: 'a1 | a1_email',
    }, {
      avatar_url: 'a2_url',
      display: 'a2 | a2_email',
    }]);
  });
});

describe('Testing extractLastModifiedFromMetadata', () => {
  it('Extract last modified', () => {
    const output = defaultPre.extractLastModifiedFromMetadata([{
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
    }], loggerMock);

    assert.equal(output.raw, '01 Jan 2018 00:01:00 GMT');
  });
});

describe('Testing fetchNav', () => {
  it('fectch nav', async () => {
    nock('http://localhost').get('/owner/repo/ref/SUMMARY.md').reply(200, '# Table of contents\n\n* a\n* b\n* [link](link.md)');

    const navPayload = await defaultPre.fetchNav(
      {
        owner: 'owner',
        repo: 'repo',
        ref: 'ref',
        resource: {},
      }, {
        REPO_RAW_ROOT: 'http://localhost/',
      },
      loggerMock,
    );

    assert.equal(navPayload.resource.body, '# Table of contents\n\n* a\n* b\n* [link](link.md)');
    assert.equal(navPayload.resource.html, '<h1>Table of contents</h1>\n<ul>\n<li>a</li>\n<li>b</li>\n<li><a href="link.md">link</a></li>\n</ul>');
  });
});

describe('Testing collectNav', () => {
  it('Collect nav', () => {
    const output = defaultPre.collectNav(
      {
        resource: {
          children: [
            '<h1>Table of contents</h1>',
            '\n',
            '<ul>\n<li>a</li>\n<li>b</li>\n<li><a href="link.md">link</a></li>\n</ul>',
          ],
        },
      },
      loggerMock,
    );

    assert.deepEqual(output, ['\n', '<ul>\n<li>a</li>\n<li>b</li>\n<li><a href="/link.html">link</a></li>\n</ul>']);
  });
});
