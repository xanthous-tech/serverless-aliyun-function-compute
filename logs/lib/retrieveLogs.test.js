'use strict';

const sinon = require('sinon');
const BbPromise = require('bluebird');
const chalk = require('chalk');

const path = require('path');
const AliyunProvider = require('../../provider/aliyunProvider');
const AliyunLogs = require('../aliyunLogs');
const Serverless = require('../../test/serverless');
const { logs, functionDefs } = require('../../test/data');

describe('DisplayServiceLogs', () => {
  let serverless;
  let aliyunLogs;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service.service = 'my-service';
    serverless.service.functions = functionDefs;
    serverless.service.provider = {
      name: 'aliyun',
      credentials: path.join(__dirname, '..', 'test', 'credentials'),
    };
    serverless.config = {
      servicePath: path.join(__dirname, '..', '..', 'test')
    };
    const options = {
      stage: 'dev',
      region: 'cn-shanghai',
      function: 'postTest'
    };
    serverless.setProvider('aliyun', new AliyunProvider(serverless, options));
    serverless.pluginManager.setCliOptions(options);
    aliyunLogs = new AliyunLogs(serverless, options);
  });

  describe('#retrieveLogs()', () => {
    let consoleLogStub;
    let getLogsIfAvailableStub;

    beforeEach(() => {
      consoleLogStub = sinon.stub(aliyunLogs.serverless.cli, 'consoleLog').returns();
      getLogsIfAvailableStub = sinon.stub(aliyunLogs.provider, 'getLogsIfAvailable');
    });

    afterEach(() => {
      aliyunLogs.serverless.cli.consoleLog.restore();
      aliyunLogs.provider.getLogsIfAvailable.restore();
    });

    it('should print relevant data on the console', () => {
      getLogsIfAvailableStub.returns(BbPromise.resolve(logs));

      let expectedOutput = [
        `${chalk.yellow.underline('Service Information')}`,
        `${chalk.yellow('service:')} my-service`,
        `${chalk.yellow('stage:')} dev`,
        `${chalk.yellow('region:')} cn-shanghai`,
        '',
        `${chalk.yellow.underline('Logs')}`,
        `  ${chalk.yellow('my-service-dev/my-service-dev-postTest')}`,
        '  - 2017-08-18T10:18:26.000Z: 2017-08-18T10:18:26.131Z  [info] FunctionCompute nodejs runtime inited.\r',
        '  - 2017-08-18T10:18:26.000Z: FC Invoke Start RequestId: 332425-41-143112-415219434\r',
        '  - 2017-08-18T10:34:21.000Z: FC Invoke End RequestId: 25222ee9-41-143112-415219434',
        ''
      ];
      return aliyunLogs.retrieveLogs().then(() => {
        expect(consoleLogStub.getCall(0).args[0].split('\n')).toEqual(expectedOutput);
      });
    });

    it('should print an logs if functions are not yet deployed', () => {
      getLogsIfAvailableStub.returns(BbPromise.resolve([]));

      let expectedOutput = [
        `${chalk.yellow.underline('Service Information')}`,
        `${chalk.yellow('service:')} my-service`,
        `${chalk.yellow('stage:')} dev`,
        `${chalk.yellow('region:')} cn-shanghai`,
        '',
        `${chalk.yellow.underline('Logs')}`,
        'There are no logs to show',
        ''
      ];
      return aliyunLogs.retrieveLogs().then(() => {
        expect(consoleLogStub.getCall(0).args[0].split('\n')).toEqual(expectedOutput);
      });
    });
  });
});
