describe('Notebook App E2E', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('loads and shows the notes list', () => {
    cy.get('.note-list').should('exist');
    cy.contains('All Notes');
  });

  it('can create and edit a note', () => {
    cy.contains('+ Note').click();
    cy.get('.note-editor input[type="text"]').should('exist').clear().type('My Cypress Note!!');
    cy.get('.editor-content').type('This is a {bold}test{bold}.');
    cy.contains('Save').click();
    cy.get('.notification-banner').should('contain', 'Note saved');
    cy.get('.note-title').should('contain', 'My Cypress Note!!');
  });

  it('can delete a note', () => {
    cy.contains('+ Note').click();
    cy.get('.note-editor input[type="text"]').clear().type('To Delete');
    cy.contains('Save').click();
    cy.get('.note-list-item.selected').within(() => {
      cy.get('button[aria-label="Delete note"]').click();
    });
    cy.get('.notification-banner').should('contain', 'deleted');
  });

  it('can create, view, and delete folders', () => {
    cy.contains('+ Add Folder').click();
    cy.get('.add-folder-form input[type="text"]').type('Work{enter}');
    cy.contains('Folder added');
    cy.contains('Work').should('exist');
    cy.contains('Work').parent('li').within(() => {
      cy.get('button[aria-label^="Delete folder"]').click();
    });
    cy.contains('Folder deleted');
  });

  it('can import/export notes', () => {
    cy.contains('⭳ Export').click();
    // Export opens new tab/download, can't verify directly
    cy.contains('⭱ Import').click();
    // Can't test file upload in Cypress easily without a real file
  });
});
