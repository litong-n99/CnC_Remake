export default {
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.ts': () => 'tsc --noEmit',
};
