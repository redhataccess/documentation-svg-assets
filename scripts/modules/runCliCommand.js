const { execSync } = require('child_process');

/**
 * Runs a command in the CLI and returns the output
 * @link https://stackoverflow.com/a/12941186
 * @param {string} command CLI command
 * @param {function} callback Function to pickup command output
 */
const runCliCommand = (command, callback) => {
  const stdout = execSync(command);
  if (stdout) {
    let output;
    if (typeof stdout === 'string') {
      output = stdout;
    }
    else if (typeof stdout.toString === 'function') {
      output = stdout.toString();
    }
    else {
      console.warn('Unable to get string value of command ouptut.', stdout);
      return;
    }
    callback(output);
  }
};

module.exports = runCliCommand;