import re

with open('harness/01_TASK_BREAKDOWN.md', 'r', encoding='utf-8') as f:
    content = f.read()

completed_tasks = {
    'Task 25', 'Task 26', 'Task 27',
    'Task 55', 'Task 56', 'Task 57', 'Task 58', 'Task 59',
    'Task 61', 'Task 62', 'Task 63', 'Task 64', 'Task 65', 'Task 66', 'Task 67', 'Task 68',
    'Task 75', 'Task 81',
    'Task 85', 'Task 86', 'Task 87', 'Task 88',
    'Task 95', 'Task 96', 'Task 97', 'Task 100',
    'Task 113', 'Task 118', 'Task 119',
    'Task 122', 'Task 123', 'Task 124', 'Task 127', 'Task 128',
    'Task 130', 'Task 133', 'Task 134', 'Task 135',
}

pattern = r'(### (Task \d+(?:\.\d+)?):.*?)(- \*\*状态\*\*：\[ \] `done`)'
matches = list(re.finditer(pattern, content, re.DOTALL))

print(f'Found {len(matches)} tasks with [ ] done status')
for m in matches:
    task_name = m.group(2)
    status = 'COMPLETED' if task_name in completed_tasks else 'UNFINISHED'
    print(f'  {task_name}: {status}')
