

module.exports = {
	defaultProjectFolder: 'src',
	commands: {
		"project:deploy": {
			beforeExecuting: async args => {
				await SuiteCloudJestUnitTestRunner.run({
				    // Jest configuration options.
				});
				return args;
			},
		},
	},
};