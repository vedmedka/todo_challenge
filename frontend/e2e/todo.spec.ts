import { expect, test } from '@playwright/test';

test('manages todos through the simple list UI', async ({ page }) => {
  const suffix = Date.now().toString();
  const firstTitle = `Write e2e test ${suffix}`;
  const secondTitle = `Second e2e test ${suffix}`;
  const escapedTitle = `Discarded TODO app ${suffix}`;
  const blurSavedTitle = `Blur saved TODO app ${suffix}`;
  const arrowDownSavedTitle = `Arrow down saved TODO app ${suffix}`;
  const arrowUpSavedTitle = `Arrow up saved TODO app ${suffix}`;
  const finalTitle = `Ship TODO app ${suffix}`;

  await page.goto('/');

  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Title is required')).toBeVisible();

  await page.getByLabel('New todo title').fill(firstTitle);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const todo = page.getByTestId('todo-item').filter({ hasText: firstTitle });
  await expect(todo).toBeVisible();

  await page.getByLabel('New todo title').fill(secondTitle);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const secondTodo = page.getByTestId('todo-item').filter({ hasText: secondTitle });
  await expect(secondTodo).toBeVisible();

  await todo.getByRole('checkbox', { name: 'Toggle complete' }).check();
  await page.getByRole('button', { name: 'Active' }).click();
  await expect(todo).toBeHidden();

  await page.getByRole('button', { name: 'Completed' }).click();
  await expect(todo).toBeVisible();

  await todo.getByRole('button', { name: 'Write e2e test' }).click();
  await expect(page.getByLabel('Edit todo title')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeHidden();
  await page.getByLabel('Edit todo title').fill(escapedTitle);
  await page.keyboard.press('Escape');
  await expect(page.getByText(firstTitle)).toBeVisible();
  await expect(page.getByText(escapedTitle)).toBeHidden();

  await todo.getByRole('button', { name: firstTitle }).click();
  await page.getByLabel('Edit todo title').fill(blurSavedTitle);
  await page.getByRole('heading', { name: /Inbox|TODO/ }).click();
  await expect(page.getByText(blurSavedTitle)).toBeVisible();

  await page.getByRole('button', { name: 'All' }).click();
  await page.getByRole('button', { name: blurSavedTitle }).click();
  await page.getByLabel('Edit todo title').fill(arrowDownSavedTitle);
  await page.keyboard.press('ArrowDown');
  await expect(page.getByLabel('Edit todo title')).toHaveValue(secondTitle);
  await expect(page.getByLabel('Edit todo title')).toBeFocused();
  await page.keyboard.type(' ready');
  await expect(page.getByLabel('Edit todo title')).toHaveValue(`${secondTitle} ready`);

  await page.getByLabel('Edit todo title').fill(arrowUpSavedTitle);
  await page.keyboard.press('ArrowUp');
  await expect(page.getByLabel('Edit todo title')).toHaveValue(arrowDownSavedTitle);
  await expect(page.getByLabel('Edit todo title')).toBeFocused();

  const editedTodo = page.getByTestId('todo-item').filter({ has: page.getByLabel('Edit todo title') });
  await expect(editedTodo.getByRole('button', { name: 'Delete' })).toBeVisible();
  await page.getByLabel('Edit todo title').fill(finalTitle);
  await page.keyboard.press('Enter');
  await expect(page.getByText(finalTitle)).toBeVisible();

  await page.getByRole('button', { name: 'All' }).click();
  await page.getByTestId('todo-item').filter({ hasText: finalTitle }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText(finalTitle)).toBeHidden();
});

test('manages multiple todo lists', async ({ page }) => {
  const suffix = Date.now().toString();
  const errandsList = `Errands ${suffix}`;
  const workList = `Work ${suffix}`;
  const renamedList = `Personal ${suffix}`;
  const errandsTodo = `Buy batteries ${suffix}`;
  const workTodo = `Prepare notes ${suffix}`;

  await page.goto('/');

  await page.getByLabel('New todo list title').fill(errandsList);
  await page.getByRole('button', { name: 'Add list' }).click();
  await expect(page.getByRole('heading', { name: errandsList })).toBeVisible();

  await page.getByLabel('New todo title').fill(errandsTodo);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByTestId('todo-item').filter({ hasText: errandsTodo })).toBeVisible();

  await page.getByLabel('New todo list title').fill(workList);
  await page.getByRole('button', { name: 'Add list' }).click();
  await expect(page.getByRole('heading', { name: workList })).toBeVisible();
  await expect(page.getByText(errandsTodo)).toBeHidden();

  await page.getByLabel('New todo title').fill(workTodo);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByTestId('todo-item').filter({ hasText: workTodo })).toBeVisible();

  await page.getByRole('button', { name: errandsList }).click();
  await expect(page.getByRole('heading', { name: errandsList })).toBeVisible();
  await expect(page.getByText(errandsTodo)).toBeVisible();
  await expect(page.getByText(workTodo)).toBeHidden();

  await page.getByTestId('todo-list-item')
    .filter({ hasText: errandsList })
    .getByRole('button', { name: 'Rename' })
    .click();
  await page.getByLabel('Edit todo list title').fill(renamedList);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: renamedList })).toBeVisible();

  page.on('dialog', dialog => dialog.accept());
  await page.getByTestId('todo-list-item')
    .filter({ hasText: renamedList })
    .getByRole('button', { name: 'Delete list' })
    .click();
  await expect(page.getByTestId('todo-list-item').filter({ hasText: renamedList })).toBeHidden();
  await expect(page.getByText(errandsTodo)).toBeHidden();
});
