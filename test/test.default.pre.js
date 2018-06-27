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
const defaultPre = require('../src/default.pre.js');

describe('Testing pre requirements for main function', () => {
  it('Exports main', () => {
    assert.ok(defaultPre.main);
  });

  it('main is a function', () => {
    assert.equal('function', typeof defaultPre.main);
  });

  it('main returns a Promise', () => {
    const ret = defaultPre.main({});
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

  it.only('Collect data', (done) => {
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
});

describe('Testing extractCommittersFromMetadata', () => {
  emptyContextIT(defaultPre.extractCommittersFromMetadata);
});

describe('Testing extractLastModifiedFromMetadata', () => {
  emptyContextIT(defaultPre.extractLastModifiedFromMetadata);
});
