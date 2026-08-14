import { expect, test } from '@playwright/test';

test('manages todos through the simple list UI', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Title is required')).toBeVisible();

  await page.getByLabel('New todo title').fill('Write e2e test');
  await page.getByRole('button', { name: 'Add' }).click();
  const todo = page.getByTestId('todo-item').filter({ hasText: 'Write e2e test' });
  await expect(todo).toBeVisible();

  await todo.getByRole('checkbox', { name: 'Toggle complete' }).check();
  await page.getByRole('button', { name: 'Active' }).click();
  await expect(todo).toBeHidden();

  await page.getByRole('button', { name: 'Completed' }).click();
  await expect(todo).toBeVisible();

  await todo.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Edit todo title').fill('Ship TODO app');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Ship TODO app')).toBeVisible();

  await page.getByRole('button', { name: 'All' }).click();
  await page.getByTestId('todo-item').filter({ hasText: 'Ship TODO app' }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Ship TODO app')).toBeHidden();
});
