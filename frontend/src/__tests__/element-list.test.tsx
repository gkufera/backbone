import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ElementList } from '../components/element-list';

describe('Element list', () => {
  const mockElements = [
    {
      id: 'elem-1',
      name: 'JOHN',
      type: 'CHARACTER',
      highlightPage: 1,
      highlightText: 'JOHN',
      departmentId: null,
      status: 'ACTIVE',
      source: 'AUTO',
    },
    {
      id: 'elem-2',
      name: 'MARY',
      type: 'CHARACTER',
      highlightPage: 3,
      highlightText: 'MARY',
      departmentId: null,
      status: 'ACTIVE',
      source: 'AUTO',
    },
    {
      id: 'elem-3',
      name: 'INT. OFFICE - DAY',
      type: 'LOCATION',
      highlightPage: 1,
      highlightText: 'INT. OFFICE - DAY',
      departmentId: null,
      status: 'ACTIVE',
      source: 'AUTO',
    },
    {
      id: 'elem-4',
      name: 'MAGIC RING',
      type: 'OTHER',
      highlightPage: 7,
      highlightText: 'MAGIC RING',
      departmentId: null,
      status: 'ACTIVE',
      source: 'MANUAL',
    },
  ];

  const mockOnArchive = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('groups elements by type (Characters, Locations, Other)', () => {
    render(<ElementList elements={mockElements} onArchive={mockOnArchive} />);

    expect(screen.getByText('Characters')).toBeInTheDocument();
    expect(screen.getByText('Locations')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('shows highlight page for each element', () => {
    render(<ElementList elements={mockElements} onArchive={mockOnArchive} />);

    // JOHN and INT. OFFICE both on page 1
    expect(screen.getAllByText('p. 1')).toHaveLength(2);
    // MARY on page 3
    expect(screen.getByText('p. 3')).toBeInTheDocument();
    // MAGIC RING on page 7
    expect(screen.getByText('p. 7')).toBeInTheDocument();
  });

  it('renders archive button for each element', () => {
    render(<ElementList elements={mockElements} onArchive={mockOnArchive} />);

    const archiveButtons = screen.getAllByRole('button', { name: /archive/i });
    expect(archiveButtons.length).toBe(4);
  });

  it('calls onArchive when archive button is clicked', async () => {
    const user = userEvent.setup();

    render(<ElementList elements={mockElements} onArchive={mockOnArchive} />);

    const archiveButtons = screen.getAllByRole('button', { name: /archive/i });
    await user.click(archiveButtons[0]);

    expect(mockOnArchive).toHaveBeenCalledWith('elem-1');
  });

  it('renders element names', () => {
    render(<ElementList elements={mockElements} onArchive={mockOnArchive} />);

    expect(screen.getByText('JOHN')).toBeInTheDocument();
    expect(screen.getByText('MARY')).toBeInTheDocument();
    expect(screen.getByText('INT. OFFICE - DAY')).toBeInTheDocument();
    expect(screen.getByText('MAGIC RING')).toBeInTheDocument();
  });

  it('renders option count badge when _count is provided', () => {
    const elementsWithCounts = mockElements.map((e, i) => ({
      ...e,
      _count: { options: i + 1 },
    }));

    render(<ElementList elements={elementsWithCounts} onArchive={mockOnArchive} />);

    expect(screen.getByText('1 option')).toBeInTheDocument();
    expect(screen.getByText('2 options')).toBeInTheDocument();
  });

  it('renders element names as links when productionId and scriptId are provided', () => {
    render(
      <ElementList
        elements={mockElements}
        onArchive={mockOnArchive}
        productionId="prod-1"
        scriptId="script-1"
      />,
    );

    const links = screen.getAllByRole('link');
    expect(links.length).toBe(4);
    expect(links[0]).toHaveAttribute(
      'href',
      '/productions/prod-1/scripts/script-1/elements/elem-1',
    );
  });

  it('renders department filter chips when elements have departments', () => {
    const elementsWithDepts = [
      {
        ...mockElements[0],
        department: { id: 'dept-cast', name: 'Cast', color: '#E63946' },
      },
      {
        ...mockElements[2],
        department: { id: 'dept-loc', name: 'Locations', color: '#264653' },
      },
    ];

    render(
      <ElementList elements={elementsWithDepts} onArchive={mockOnArchive} />,
    );

    expect(screen.getByText('Cast')).toBeInTheDocument();
    // "Locations" appears both as chip text and as type group header
    expect(screen.getAllByText('Locations').length).toBeGreaterThanOrEqual(1);
    // Filter buttons: All + Cast + Locations
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('renders color indicator on element rows', () => {
    const elementsWithDepts = [
      {
        ...mockElements[0],
        department: { id: 'dept-cast', name: 'Cast', color: '#E63946' },
      },
    ];

    render(
      <ElementList elements={elementsWithDepts} onArchive={mockOnArchive} />,
    );

    // The element row should have a border-left style
    const row = screen.getByText('JOHN').closest('li');
    expect(row).toHaveStyle({ borderLeftColor: '#E63946' });
  });

  it('clicking anywhere on row calls onElementClick', async () => {
    const user = userEvent.setup();
    const onElementClick = vi.fn();

    render(
      <ElementList
        elements={mockElements}
        onArchive={mockOnArchive}
        onElementClick={onElementClick}
      />,
    );

    // Click on the row (li element) for JOHN
    const row = screen.getByText('JOHN').closest('li');
    await user.click(row!);

    expect(onElementClick).toHaveBeenCalledWith('elem-1');
  });

  it('archive button stopPropagation', async () => {
    const user = userEvent.setup();
    const onElementClick = vi.fn();

    render(
      <ElementList
        elements={mockElements}
        onArchive={mockOnArchive}
        onElementClick={onElementClick}
      />,
    );

    const archiveButtons = screen.getAllByRole('button', { name: /archive/i });
    await user.click(archiveButtons[0]);

    // Archive should be called, but NOT onElementClick
    expect(mockOnArchive).toHaveBeenCalledWith('elem-1');
    expect(onElementClick).not.toHaveBeenCalled();
  });
});
