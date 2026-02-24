import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/api', () => ({
  scriptsApi: {
    acceptElements: vi.fn(),
    generateImplied: vi.fn(),
  },
  elementsApi: {
    hardDelete: vi.fn(),
    update: vi.fn(),
  },
}));

import { scriptsApi, elementsApi } from '../lib/api';
const mockedScriptsApi = vi.mocked(scriptsApi);
const mockedElementsApi = vi.mocked(elementsApi);

import { ElementWizard } from '../components/element-wizard';

const mockElements = [
  {
    id: 'elem-1',
    name: 'JOHN',
    type: 'CHARACTER',
    highlightPage: 1,
    highlightText: 'JOHN',
    departmentId: 'dept-cast',
    status: 'ACTIVE',
    source: 'AUTO',
    scriptId: 'script-1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'elem-2',
    name: 'REVOLVER',
    type: 'OTHER',
    highlightPage: 1,
    highlightText: 'REVOLVER',
    departmentId: 'dept-props',
    status: 'ACTIVE',
    source: 'AUTO',
    scriptId: 'script-1',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

const mockDepartments = [
  { id: 'dept-cast', productionId: 'prod-1', name: 'Cast', color: '#E63946', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'dept-props', productionId: 'prod-1', name: 'Props', color: '#2A9D8F', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'dept-costume', productionId: 'prod-1', name: 'Costume', color: '#457B9D', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];

const mockSceneData = [
  { sceneNumber: 1, location: 'INT. OFFICE - DAY', characters: ['JOHN'] },
];

describe('ElementWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedElementsApi.hardDelete.mockResolvedValue({ message: 'deleted' });
    mockedElementsApi.update.mockResolvedValue({ element: {} as any });
    mockedScriptsApi.acceptElements.mockResolvedValue({ message: 'accepted' });
    mockedScriptsApi.generateImplied.mockResolvedValue({ message: 'done', count: 2 });
  });

  it('Step 1: renders elements with checkboxes', () => {
    render(
      <ElementWizard
        scriptId="script-1"
        elements={mockElements as any}
        sceneData={mockSceneData}
        departments={mockDepartments as any}
        onComplete={vi.fn()}
      />,
    );

    expect(screen.getByText('JOHN')).toBeInTheDocument();
    expect(screen.getByText('REVOLVER')).toBeInTheDocument();
    // Should have checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();
  });

  it('Step 1: unchecking and clicking Next calls hard-delete', async () => {
    const user = userEvent.setup();

    render(
      <ElementWizard
        scriptId="script-1"
        elements={mockElements as any}
        sceneData={null}
        departments={mockDepartments as any}
        onComplete={vi.fn()}
      />,
    );

    // Uncheck REVOLVER
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]); // Uncheck second element

    // Click Next
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(mockedElementsApi.hardDelete).toHaveBeenCalledWith('elem-2');
    });
  });

  it('Step 1: shows implied element generation options', () => {
    render(
      <ElementWizard
        scriptId="script-1"
        elements={mockElements as any}
        sceneData={mockSceneData}
        departments={mockDepartments as any}
        onComplete={vi.fn()}
      />,
    );

    expect(screen.getByText(/per scene/i)).toBeInTheDocument();
    expect(screen.getByText(/per character/i)).toBeInTheDocument();
  });

  it('Step 1: per-scene button calls generateImplied', async () => {
    const user = userEvent.setup();

    render(
      <ElementWizard
        scriptId="script-1"
        elements={mockElements as any}
        sceneData={mockSceneData}
        departments={mockDepartments as any}
        onComplete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /per scene/i }));

    await waitFor(() => {
      expect(mockedScriptsApi.generateImplied).toHaveBeenCalledWith('script-1', 'per-scene');
    });
  });

  it('shows error message when hardDelete fails in step 1', async () => {
    const user = userEvent.setup();
    mockedElementsApi.hardDelete.mockRejectedValue(new Error('Network error'));

    render(
      <ElementWizard
        scriptId="script-1"
        elements={mockElements as any}
        sceneData={null}
        departments={mockDepartments as any}
        onComplete={vi.fn()}
      />,
    );

    // Uncheck one element so it will be deleted
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);

    // Click Next — triggers hardDelete which fails
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('shows error message when generateImplied fails', async () => {
    const user = userEvent.setup();
    mockedScriptsApi.generateImplied.mockRejectedValue(new Error('Server error'));

    render(
      <ElementWizard
        scriptId="script-1"
        elements={mockElements as any}
        sceneData={mockSceneData}
        departments={mockDepartments as any}
        onComplete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /per scene/i }));

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });
  });

  it('shows error message when department update fails in step 2', async () => {
    const user = userEvent.setup();
    mockedElementsApi.update.mockRejectedValue(new Error('Update failed'));

    render(
      <ElementWizard
        scriptId="script-1"
        elements={mockElements as any}
        sceneData={null}
        departments={mockDepartments as any}
        onComplete={vi.fn()}
      />,
    );

    // Go to step 2
    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText('Step 2: Review Departments')).toBeInTheDocument();
    });

    // Change a department assignment
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], 'dept-costume');

    // Click Next — triggers update which fails
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/update failed/i)).toBeInTheDocument();
    });
  });

  it('shows error message when acceptElements fails in step 3', async () => {
    const user = userEvent.setup();
    mockedScriptsApi.acceptElements.mockRejectedValue(new Error('Accept failed'));

    render(
      <ElementWizard
        scriptId="script-1"
        elements={mockElements as any}
        sceneData={null}
        departments={mockDepartments as any}
        onComplete={vi.fn()}
      />,
    );

    // Step 1 → Step 2
    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText('Step 2: Review Departments')).toBeInTheDocument();
    });

    // Step 2 → Step 3
    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText('Step 3: Accept')).toBeInTheDocument();
    });

    // Accept — fails
    await user.click(screen.getByRole('button', { name: /accept/i }));

    await waitFor(() => {
      expect(screen.getByText(/accept failed/i)).toBeInTheDocument();
    });
  });

  it('Step 2: renders department dropdowns', async () => {
    const user = userEvent.setup();

    render(
      <ElementWizard
        scriptId="script-1"
        elements={mockElements as any}
        sceneData={null}
        departments={mockDepartments as any}
        onComplete={vi.fn()}
      />,
    );

    // Go to step 2
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Step 2: Review Departments')).toBeInTheDocument();
    });

    // Should have department dropdowns
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('Step 3: Accept calls acceptElements and onComplete', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();

    render(
      <ElementWizard
        scriptId="script-1"
        elements={mockElements as any}
        sceneData={null}
        departments={mockDepartments as any}
        onComplete={onComplete}
      />,
    );

    // Step 1 → Step 2
    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText('Step 2: Review Departments')).toBeInTheDocument();
    });

    // Step 2 → Step 3
    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByText('Step 3: Accept')).toBeInTheDocument();
    });

    // Accept
    await user.click(screen.getByRole('button', { name: /accept/i }));

    await waitFor(() => {
      expect(mockedScriptsApi.acceptElements).toHaveBeenCalledWith('script-1');
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
