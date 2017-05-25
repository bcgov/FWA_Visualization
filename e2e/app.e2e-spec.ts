import { FwaPage } from './app.po';

describe('fwa App', () => {
  let page: FwaPage;

  beforeEach(() => {
    page = new FwaPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
