const fs = require('fs');
let content = fs.readFileSync('harness/01_TASK_BREAKDOWN.md', 'utf-8');

const completedTasks = [
  'Task 25', 'Task 26', 'Task 27',
  'Task 55', 'Task 56', 'Task 57', 'Task 58', 'Task 59',
  'Task 61', 'Task 62', 'Task 63', 'Task 64', 'Task 65', 'Task 66', 'Task 67', 'Task 68',
  'Task 75', 'Task 81',
  'Task 85', 'Task 86', 'Task 87', 'Task 88',
  'Task 95', 'Task 96', 'Task 97', 'Task 100',
  'Task 113', 'Task 118', 'Task 119',
  'Task 122', 'Task 123', 'Task 124', 'Task 127', 'Task 128', 'Task 129',
  'Task 130', 'Task 133', 'Task 134', 'Task 135',
];

let updated = 0;
for (const task of completedTasks) {
  const escapedTask = task.replace(/\./g, '\\.');
  const pattern = new RegExp(
    '(### ' + escapedTask + ':.*?)' +
    '(- \\*\\*状态\\*\\*：\\[ \\] `done`)',
    's'
  );
  if (pattern.test(content)) {
    content = content.replace(
      pattern,
      '$1- **状态**：[x] `done`\n- **完成备注**：已实现并集成。e2e 测试通过。'
    );
    updated++;
  }
}

fs.writeFileSync('harness/01_TASK_BREAKDOWN.md', content, 'utf-8');
console.log('Updated ' + updated + ' task statuses');
