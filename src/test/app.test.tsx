import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { useLibraryStore } from '@/stores/libraryStore';
import { useEditorStore } from '@/stores/editorStore';
import { __resetDbForTests } from '@/lib/db';

beforeEach(async () => {
  cleanup();
  __resetDbForTests();
  useLibraryStore.setState({ projects: [], hydrated: false, activeProjectId: null });
  useEditorStore.getState().closeProject();
  document.title = 'Haolio';
});

describe('App shell', () => {
  it('shows the dashboard with the seeded welcome project', async () => {
    render(<App />);
    expect(await screen.findByText('Recent Projects')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open project/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Welcome to Haolio/)).toBeInTheDocument());
  });

  it('creates a project through the dialog and opens the editor', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Recent Projects');

    await user.click(screen.getByRole('button', { name: /new project/i }));
    const nameInput = await screen.findByLabelText(/project name/i);
    await user.type(nameInput, 'My Game GDD');
    await user.click(screen.getByRole('button', { name: /create project/i }));

    // Editor chrome appears with the project name and board list.
    expect(await screen.findByText('My Game GDD')).toBeInTheDocument();
    expect(screen.getByText('Boards')).toBeInTheDocument();
    expect(document.title).toBe('Haolio — My Game GDD');
  });

  it('opens an existing project from the dashboard and returns back', async () => {
    const user = userEvent.setup();
    render(<App />);
    const card = await screen.findByText(/Welcome to Haolio/);
    await user.click(card);

    expect(await screen.findByText('Boards')).toBeInTheDocument();
    // The welcome project ships with two boards (title appears in the
    // breadcrumb and the sidebar).
    expect(screen.getAllByText('Getting Started').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Shortcuts').length).toBeGreaterThanOrEqual(1);

    // Returning to the dashboard unmounts the editor and restores the list.
    useLibraryStore.getState().closeProject();
    expect(await screen.findByText('Recent Projects')).toBeInTheDocument();
    expect(screen.queryByText('Boards')).not.toBeInTheDocument();
  });

  it('window title reflects the open project', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Recent Projects');
    await user.click(screen.getByRole('button', { name: /new project/i }));
    await user.type(await screen.findByLabelText(/project name/i), 'Title Check');
    await user.click(screen.getByRole('button', { name: /create project/i }));
    await waitFor(() => expect(document.title).toBe('Haolio — Title Check'));
  });
});
