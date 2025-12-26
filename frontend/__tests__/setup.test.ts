/**
 * Базовый тест для проверки работоспособности Jest
 * Этот тест гарантирует, что тестовая среда настроена правильно
 */
describe('Test Setup', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should have jest-dom matchers available', () => {
    const element = document.createElement('div');
    element.setAttribute('data-testid', 'test-element');
    document.body.appendChild(element);
    expect(element).toBeInTheDocument();
    document.body.removeChild(element);
  });
});

