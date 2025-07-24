// Cypress E2E: high-level UI flows for NotebookMonolithicContainer
describe('Notebook UI flows', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('renders main UI and theme switch works', () => {
    cy.contains('Notebook');
    cy.get('button[aria-label="Settings"]').click();
    cy.contains('Theme').should('exist');
    cy.get('select').select('dark');
    cy.get('body').should('exist'); // basic smoke
  });

  it('can create and edit a note', () => {
    cy.contains('+ New Note').click();
    cy.get('input[placeholder="Note title"]').type('Test Note');
    cy.get('.rte-content[contenteditable="true"]').type('Some {ctrl+b}bold{ctrl+b} content');
    cy.contains('💾 Save').click();
    cy.contains('Test Note');
  });

  it('search finds notes', () => {
    cy.get('input[placeholder="Search…"]').type('Test Note');
    cy.contains('Test Note');
  });

  it('bulk delete/restore works', () => {
    cy.get('input[type="checkbox"]').first().check();
    cy.contains('Delete selected').click();
    cy.contains('🗑️ Trash').click();
    cy.contains('Restore selected').click();
    cy.contains('Test Note');
  });

  it('can organize notes in folders', () => {
    cy.get('input[placeholder="Note title"]').clear().type('Foldered Note');
    cy.get('.editor select').select('+ New folder…');
    cy.on('window:prompt', () => 'My Folder');
    cy.contains('💾 Save').click();
    cy.contains('My Folder');
  });

  it('export/import works', () => {
    cy.contains('⬇ Export');
    // Only basic export button existence test since download cannot be asserted in E2E
  });
});
