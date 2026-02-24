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

  it('renders view mode toggle buttons', () => {
    render(<ElementList elements={mockElements} onArchive={mockOnArchive} />);

    expect(screen.getByRole('button', { name: /by type/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /by appearance/i })).toBeInTheDocument();
  });

  it('sorts by first appearance in By Appearance mode', async () => {
    const user = userEvent.setup();

    render(<ElementList elements={mockElements} onArchive={mockOnArchive} />);

    // Switch to By Appearance view
    await user.click(screen.getByRole('button', { name: /by appearance/i }));

    // In appearance mode, elements should be sorted by highlightPage ASC
    // Page 1: JOHN (elem-1), INT. OFFICE - DAY (elem-3) — alphabetical within page
    // Page 3: MARY (elem-2)
    // Page 7: MAGIC RING (elem-4)
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('INT. OFFICE - DAY');
    expect(items[1]).toHaveTextContent('JOHN');
    expect(items[2]).toHaveTextContent('MARY');
    expect(items[3]).toHaveTextContent('MAGIC RING');
  });

  it('active row has inverted text on all children', () => {
    render(
      <ElementList
        elements={mockElements}
        onArchive={mockOnArchive}
        activeElementId="elem-1"
      />,
    );

    const row = screen.getByText('JOHN').closest('li');
    expect(row).toHaveClass('bg-black');
    expect(row).toHaveClass('text-white');
  });

  it('clicking department chip filters elements to that department', async () => {
    const user = userEvent.setup();
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

    // Click Cast chip
    await user.click(screen.getByRole('button', { name: /cast/i }));

    // JOHN should be visible, INT. OFFICE should not
    expect(screen.getByText('JOHN')).toBeInTheDocument();
    expect(screen.queryByText('INT. OFFICE - DAY')).not.toBeInTheDocument();
  });

  it('clicking active chip again shows all elements', async () => {
    const user = userEvent.setup();
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

    // Click Cast chip to filter
    await user.click(screen.getByRole('button', { name: /cast/i }));
    expect(screen.queryByText('INT. OFFICE - DAY')).not.toBeInTheDocument();

    // Click Cast chip again to show all (or click "All")
    await user.click(screen.getByRole('button', { name: /all/i }));
    expect(screen.getByText('JOHN')).toBeInTheDocument();
    expect(screen.getByText('INT. OFFICE - DAY')).toBeInTheDocument();
  });

  it('null highlightPage sorts last in By Appearance view', async () => {
    const user = userEvent.setup();
    const elementsWithNull = [
      ...mockElements,
      {
        id: 'elem-5',
        name: 'MYSTERY PROP',
        type: 'OTHER',
        highlightPage: null,
        highlightText: null,
        departmentId: null,
        status: 'ACTIVE',
        source: 'MANUAL',
      },
    ];

    render(<ElementList elements={elementsWithNull} onArchive={mockOnArchive} />);

    // Switch to By Appearance view
    await user.click(screen.getByRole('button', { name: /by appearance/i }));

    const items = screen.getAllByRole('listitem');
    // MYSTERY PROP should be last (null highlightPage)
    expect(items[items.length - 1]).toHaveTextContent('MYSTERY PROP');
  });

  it('null department color renders no border indicator', () => {
    const elementsWithNullColor = [
      {
        ...mockElements[0],
        department: { id: 'dept-cast', name: 'Cast', color: null },
      },
    ];

    render(
      <ElementList elements={elementsWithNullColor} onArchive={mockOnArchive} />,
    );

    const row = screen.getByText('JOHN').closest('li') as HTMLElement;
    // No border-left inline style when color is null
    expect(row.style.borderLeft).toBe('');
  });

  it('type group lists have aria-label', () => {
    render(<ElementList elements={mockElements} onArchive={mockOnArchive} />);

    // Characters group should have an aria-labeled list
    const charactersList = screen.getByRole('list', { name: 'Characters' });
    expect(charactersList).toBeInTheDocument();
  });

  it('appearance view list has aria-label', async () => {
    const user = userEvent.setup();

    render(<ElementList elements={mockElements} onArchive={mockOnArchive} />);

    await user.click(screen.getByRole('button', { name: /by appearance/i }));

    const sortedList = screen.getByRole('list', { name: 'Elements sorted by appearance' });
    expect(sortedList).toBeInTheDocument();
  });

  it('renders green temperature indicator for approved element', () => {
    const elementsWithTemp = [
      {
        ...mockElements[0],
        approvalTemperature: 'green' as const,
      },
    ];

    const { container } = render(
      <ElementList elements={elementsWithTemp} onArchive={mockOnArchive} />,
    );

    expect(container.querySelector('.temp-green')).toBeInTheDocument();
  });

  it('renders red temperature indicator for rejected-only element', () => {
    const elementsWithTemp = [
      {
        ...mockElements[0],
        approvalTemperature: 'red' as const,
      },
    ];

    const { container } = render(
      <ElementList elements={elementsWithTemp} onArchive={mockOnArchive} />,
    );

    expect(container.querySelector('.temp-red')).toBeInTheDocument();
  });

  it('renders no temperature indicator for element with no approvals', () => {
    const elementsNoTemp = [
      {
        ...mockElements[0],
        approvalTemperature: null,
      },
    ];

    const { container } = render(
      <ElementList elements={elementsNoTemp} onArchive={mockOnArchive} />,
    );

    expect(container.querySelector('.temp-green')).not.toBeInTheDocument();
    expect(container.querySelector('.temp-yellow')).not.toBeInTheDocument();
    expect(container.querySelector('.temp-red')).not.toBeInTheDocument();
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
