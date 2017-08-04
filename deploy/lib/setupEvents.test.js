'use strict';

const fs = require('fs');
const path = require('path');

const sinon = require('sinon');
const BbPromise = require('bluebird');

const AliyunProvider = require('../../provider/aliyunProvider');
const AliyunDeploy = require('../aliyunDeploy');
const Serverless = require('../../test/serverless');
const { apiGroup, apis, group, fullGroup, role, fullRole, fullApis, functions } = require('../../test/data');

describe('setupEvents', () => {
  let serverless;
  let aliyunDeploy;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service.service = 'my-service';
    serverless.service.provider = {
      name: 'aliyun',
      credentials: path.join(__dirname, '..', '..', 'test', 'credentials'),
    };
    serverless.config = {
      servicePath: path.join(__dirname, '..', '..', 'test')
    };
    const options = {
      stage: 'dev',
      region: 'cn-shanghai',
    };
    serverless.setProvider('aliyun', new AliyunProvider(serverless, options));
    aliyunDeploy = new AliyunDeploy(serverless, options);    aliyunDeploy.templates = {
      create: require(path.join(__dirname, '..', '..', 'test', '.serverless', 'configuration-template-create.json')),
      update: require(path.join(__dirname, '..', '..', 'test', '.serverless', 'configuration-template-update.json')),
    }
  });

  describe('#setupEvents()', () => {
    let createApisIfNeededStub;
    let createTriggersIfNeededStub;

    beforeEach(() => {
      createApisIfNeededStub = sinon.stub(aliyunDeploy, 'createApisIfNeeded')
        .returns(BbPromise.resolve());
      createTriggersIfNeededStub = sinon.stub(aliyunDeploy, 'createTriggersIfNeeded')
        .returns(BbPromise.resolve());
    });

    afterEach(() => {
      aliyunDeploy.createApisIfNeeded.restore();
      aliyunDeploy.createTriggersIfNeeded.restore();
    });

    it('should run promise chain', () => aliyunDeploy
      .setupEvents().then(() => {
        expect(createApisIfNeededStub.calledOnce).toEqual(true);
        expect(createTriggersIfNeededStub.calledAfter(createApisIfNeededStub));
      })
    );

    it('should set apis property', () => {
      return aliyunDeploy.setupEvents().then(() => {
          expect(aliyunDeploy.apis).toEqual(apis);
        });
      }
    );
  });

  describe('#setupEvents()', () => {
    let setupRoleStub;
    let getApiGroupStub;
    let createApiGroupStub;
    let getApisStub;
    let updateApiStub;
    let createApiStub;
    let deployApiStub;
    let consoleLogStub;

    beforeEach(() => {
      setupRoleStub = sinon.stub(aliyunDeploy, 'setupRole');
      getApiGroupStub = sinon.stub(aliyunDeploy.provider, 'getApiGroup');
      createApiGroupStub = sinon.stub(aliyunDeploy.provider, 'createApiGroup');
      getApisStub = sinon.stub(aliyunDeploy.provider, 'getApis');
      updateApiStub = sinon.stub(aliyunDeploy.provider, 'updateApi');
      createApiStub = sinon.stub(aliyunDeploy.provider, 'createApi');
      deployApiStub = sinon.stub(aliyunDeploy.provider, 'deployApi');
      consoleLogStub = sinon.stub(aliyunDeploy.serverless.cli, 'log').returns();
    });

    afterEach(() => {
      aliyunDeploy.setupRole.restore();
      aliyunDeploy.provider.getApiGroup.restore();
      aliyunDeploy.provider.createApiGroup.restore();
      aliyunDeploy.provider.getApis.restore();
      aliyunDeploy.provider.updateApi.restore();
      aliyunDeploy.provider.createApi.restore();
      aliyunDeploy.provider.deployApi.restore();
      aliyunDeploy.serverless.cli.log.restore();
    });

    it('should set up apis property from scratch', () => {
      setupRoleStub.returns(BbPromise.resolve(fullRole));
      getApiGroupStub.returns(BbPromise.resolve(undefined));
      createApiGroupStub.returns(BbPromise.resolve(fullGroup));
      getApisStub.returns(BbPromise.resolve([]));
      updateApiStub.returns(BbPromise.resolve());
      createApiStub.onCall(0).returns(BbPromise.resolve(fullApis[0]));
      createApiStub.onCall(1).returns(BbPromise.resolve(fullApis[1]));
      deployApiStub.returns(BbPromise.resolve());

      return aliyunDeploy.setupEvents().then(() => {
        expect(setupRoleStub.calledOnce).toEqual(true);
        expect(setupRoleStub.calledWithExactly(role)).toEqual(true);

        expect(getApiGroupStub.calledAfter(setupRoleStub)).toEqual(true);
        expect(getApiGroupStub.calledOnce).toEqual(true);
        expect(getApiGroupStub.calledWithExactly('my_service_dev_api')).toEqual(true);

        expect(createApiGroupStub.calledAfter(getApiGroupStub)).toEqual(true);
        expect(createApiGroupStub.calledOnce).toEqual(true);
        expect(createApiGroupStub.calledWithExactly(apiGroup)).toEqual(true);

        expect(getApisStub.calledAfter(createApiGroupStub)).toEqual(true);
        expect(getApisStub.calledOnce).toEqual(true);
        expect(getApisStub.calledWithExactly({
          GroupId: fullGroup.GroupId
        })).toEqual(true);

        expect(updateApiStub.called).toEqual(false);

        expect(createApiStub.calledAfter(getApisStub)).toEqual(true);
        expect(createApiStub.calledTwice).toEqual(true);

        expect(createApiStub.calledWithExactly(
          fullGroup,
          fullRole,
          apis[0]
        )).toEqual(true);
        expect(createApiStub.calledWithExactly(
          fullGroup,
          fullRole,
          apis[1]
        )).toEqual(true);

        expect(deployApiStub.calledAfter(createApiStub)).toEqual(true);
        expect(deployApiStub.calledTwice).toEqual(true);
        expect(deployApiStub.calledWithExactly(
          fullGroup,
          fullApis[0]
        )).toEqual(true);
        expect(deployApiStub.calledWithExactly(
          fullGroup,
          fullApis[0]
        )).toEqual(true);

        const logs = [
          'Creating API group my_service_dev_api...',
          'Created API group my_service_dev_api',
          'Creating API sls_http_my_service_dev_postTest...',
          'Created API sls_http_my_service_dev_postTest',
          'Creating API sls_http_my_service_dev_getTest...',
          'Created API sls_http_my_service_dev_getTest',
          'Deploying API sls_http_my_service_dev_postTest...',
          'Deployed API sls_http_my_service_dev_postTest',
          'POST http://523e8dc7bbe04613b5b1d726c2a7889d-cn-shanghai.alicloudapi.com/baz -> my-service-dev.my-service-dev-postTest',
          'Deploying API sls_http_my_service_dev_getTest...',
          'Deployed API sls_http_my_service_dev_getTest',
          'GET http://523e8dc7bbe04613b5b1d726c2a7889d-cn-shanghai.alicloudapi.com/quo -> my-service-dev.my-service-dev-getTest'
        ];
        expect(consoleLogStub.callCount).toEqual(logs.length);
        for (var i = 0; i < consoleLogStub.callCount; ++i) {
          expect(consoleLogStub.calledWithExactly(logs[i])).toEqual(true);
        }
      });
    });

    it('should update apis properly', () => {
      setupRoleStub.returns(BbPromise.resolve(fullRole));
      getApiGroupStub.returns(BbPromise.resolve(fullGroup));
      createApiGroupStub.returns(BbPromise.resolve());
      getApisStub.returns(BbPromise.resolve(fullApis));
      createApiStub.returns(BbPromise.resolve());
      updateApiStub.onCall(0).returns(BbPromise.resolve(fullApis[0]));
      updateApiStub.onCall(1).returns(BbPromise.resolve(fullApis[1]));
      deployApiStub.returns(BbPromise.resolve());

      return aliyunDeploy.setupEvents().then(() => {
        expect(setupRoleStub.calledOnce).toEqual(true);
        expect(setupRoleStub.calledWithExactly(role)).toEqual(true);

        expect(getApiGroupStub.calledAfter(setupRoleStub)).toEqual(true);
        expect(getApiGroupStub.calledOnce).toEqual(true);
        expect(getApiGroupStub.calledWithExactly('my_service_dev_api')).toEqual(true);

        expect(createApiGroupStub.called).toEqual(false);

        expect(getApisStub.calledAfter(getApiGroupStub)).toEqual(true);
        expect(getApisStub.calledOnce).toEqual(true);
        expect(getApisStub.calledWithExactly({
          GroupId: fullGroup.GroupId
        })).toEqual(true);

        expect(createApiStub.called).toEqual(false);

        expect(updateApiStub.calledAfter(getApisStub)).toEqual(true);
        expect(updateApiStub.calledTwice).toEqual(true);
        expect(updateApiStub.calledWithExactly(
          fullGroup,
          fullRole,
          Object.assign({ApiId: fullApis[0].ApiId}, apis[0])
        )).toEqual(true);
        expect(updateApiStub.calledWithExactly(
          fullGroup,
          fullRole,
          Object.assign({ApiId: fullApis[1].ApiId}, apis[1])
        )).toEqual(true);

        expect(deployApiStub.calledAfter(updateApiStub)).toEqual(true);
        expect(deployApiStub.calledTwice).toEqual(true);
        expect(deployApiStub.calledWithExactly(
          fullGroup,
          fullApis[0]
        )).toEqual(true);
        expect(deployApiStub.calledWithExactly(
          fullGroup,
          fullApis[0]
        )).toEqual(true);

        const logs = [
          'API group my_service_dev_api exists.',
          'Updating API sls_http_my_service_dev_postTest...',
          'Updated API sls_http_my_service_dev_postTest',
          'Updating API sls_http_my_service_dev_getTest...',
          'Updated API sls_http_my_service_dev_getTest',
          'Deploying API sls_http_my_service_dev_postTest...',
          'Deployed API sls_http_my_service_dev_postTest',
          'POST http://523e8dc7bbe04613b5b1d726c2a7889d-cn-shanghai.alicloudapi.com/baz -> my-service-dev.my-service-dev-postTest',
          'Deploying API sls_http_my_service_dev_getTest...',
          'Deployed API sls_http_my_service_dev_getTest',
          'GET http://523e8dc7bbe04613b5b1d726c2a7889d-cn-shanghai.alicloudapi.com/quo -> my-service-dev.my-service-dev-getTest'
        ];
        expect(consoleLogStub.callCount).toEqual(logs.length);
        for (var i = 0; i < consoleLogStub.callCount; ++i) {
          expect(consoleLogStub.calledWithExactly(logs[i])).toEqual(true);
        }
      });
    });
  });
});