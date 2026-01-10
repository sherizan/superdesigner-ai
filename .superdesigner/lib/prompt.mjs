/**
 * Interactive CLI prompts using Node.js readline.
 * No external dependencies.
 */

import { createInterface } from 'readline';

/**
 * Prompt the user to select a project from a list.
 * @param {string[]} projects - Array of project slugs
 * @returns {Promise<string>} - Selected project slug
 */
export async function selectProject(projects) {
  if (projects.length === 0) {
    return null;
  }

  if (projects.length === 1) {
    return projects[0];
  }

  console.log('');
  console.log('Select a project:');
  console.log('');
  
  projects.forEach((project, index) => {
    console.log(`  ${index + 1}. ${project}`);
  });
  
  console.log('');

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const askQuestion = () => {
      rl.question('Enter number: ', (answer) => {
        const num = parseInt(answer.trim(), 10);
        
        if (num >= 1 && num <= projects.length) {
          rl.close();
          resolve(projects[num - 1]);
        } else {
          console.log(`Please enter a number between 1 and ${projects.length}`);
          askQuestion();
        }
      });
    };

    askQuestion();
  });
}

/**
 * Prompt the user for confirmation.
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} - true if confirmed
 */
export async function confirm(message) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}
