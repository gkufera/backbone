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

  it('defaults to By Appearance view mode', () => {
    render(<ElementList elements={mockElements} onArchive={mockOnArchive} />);

    // By Appearance button should be active (bg-black)
    const appearanceBtn = screen.getByRole('button', { name: /by appearance/i });
    expect(appearanceBtn.className).toContain('bg-black');

    // Should show sorted list, not grouped
    const list = screen.getByRole('list', { name: 'Elements sorted by appearance' });
    expect(list).toBeInTheDocument();
  });

  it('shows "By Department" button instead of "By Type"', () => {
    render(<ElementList elements={mockElements} onArchive={mockOnArchive} />);

    expect(screen.getByRole('button', { name: /by department/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /by type/i })).not.toBeInTheDocument();
  });

  it('groups elements by department name in By Department mode', async () => {
    const user = userEvent.setup();
    const elementsWithDepts = [
      {
        ...mockElements[0],
        department: { id: 'dept-cast', name: 'Cast', color: '#E63946' },
      },
      {
        ...mockElements[2],
        department: { id: 'dept-loc', name: 'Locations Dept', color: '#264653' },
      },
      {
        ...mockElements[3],
        // No department
      },
    ];

    render(<ElementList elements={elementsWithDepts} onArchive={mockOnArchive} />);

    await user.click(screen.getByRole('button', { name: /by department/i }));

    // Should show department names as group headers (h3 elements)
    const headings = screen.getAllByRole('heading', { level: 3 });
    const headingTexts = headings.map((h) => h.textContent);
    expect(headingTexts).toContain('Cast');
    expect(headingTexts).toContain('Locations Dept');
    expect(headingTexts).toContain('Unassigned');
  });

  it('shows "Sort by:" label before toggle buttons', () => {
    render(<ElementList elements={mockElements} onArchive={mockOnArchive} />);

    expect(screen.getByText('Sort by:')).toBeInTheDocument();
  });

  it('shows "Filter elements by department:" label above department chips', () => {
    const elementsWithDepts = [
      {
        ...mockElements[0],
        department: { id: 'dept-cast', name: 'Cast', color: '#E63946' },
      },
    ];

    render(<ElementList elements={elementsWithDepts} onArchive={mockOnArchive} />);

    expect(screen.getByText('Filter elements by department:')).toBeInTheDocument();
  });

  it('shows highlight page for each element', () => {
    render(<ElementList elements={mockElements} onArchive={mockOnArchive} />);

    expect(screen.getAllByText('p. 1')).toHaveLength(2);
    expect(screen.getByText('p. 3')).toBeInTheDocument();
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

    expect(mockOnArchive).toHaveBeenCalledWith('elem-3');
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
      '/productions/prod-1/scripts/script-1/elements/elem-3',
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
    expect(screen.getAllByText('Locations').length).toBeGreaterThanOrEqual(1);
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

    const row = screen.getByText('JOHN').closest('li');
    await user.click(row!);

    expect(onElementClick).toHaveBeenCalledWith('elem-1');
  });

  it('sorts by first appearance in default By Appearance mode', () => {
    render(<ElementList elements={mockElements} onArchive={mockOnArchive} />);

    // Default is By Appearance, elements sorted by highlightPage ASC
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

    await user.click(screen.getByRole('button', { name: /cast/i }));

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

    await user.click(screen.getByRole('button', { name: /cast/i }));
    expect(screen.queryByText('INT. OFFICE - DAY')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /all/i }));
    expect(screen.getByText('JOHN')).toBeInTheDocument();
    expect(screen.getByText('INT. OFFICE - DAY')).toBeInTheDocument();
  });

  it('null highlightPage sorts last in By Appearance view', () => {
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

    const items = screen.getAllByRole('listitem');
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
    expect(row.style.borderLeft).toBe('');
  });

  it('appearance view list has aria-label', () => {
    render(<ElementList elements={mockElements} onArchive={mockOnArchive} />);

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

  it('renders text filter input with placeholder', () => {
    render(<ElementList elements={mockElements} onArchive={mockOnArchive} />);

    expect(screen.getByPlaceholderText('Filter elements...')).toBeInTheDocument();
  });

  it('typing in filter narrows displayed elements by name', async () => {
    const user = userEvent.setup();

    render(<ElementList elements={mockElements} onArchive={mockOnArchive} />);

    const input = screen.getByPlaceholderText('Filter elements...');
    await user.type(input, 'john');

    expect(screen.getByText('JOHN')).toBeInTheDocument();
    expect(screen.queryByText('MARY')).not.toBeInTheDocument();
    expect(screen.queryByText('INT. OFFICE - DAY')).not.toBeInTheDocument();
    expect(screen.queryByText('MAGIC RING')).not.toBeInTheDocument();
  });

  it('text filter works alongside department filter chips', async () => {
    const user = userEvent.setup();
    const elementsWithDepts = [
      {
        ...mockElements[0],
        department: { id: 'dept-cast', name: 'Cast', color: '#E63946' },
      },
      {
        ...mockElements[1],
        department: { id: 'dept-cast', name: 'Cast', color: '#E63946' },
      },
      {
        ...mockElements[2],
        department: { id: 'dept-loc', name: 'Locations', color: '#264653' },
      },
    ];

    render(<ElementList elements={elementsWithDepts} onArchive={mockOnArchive} />);

    await user.click(screen.getByRole('button', { name: /cast/i }));

    expect(screen.getByText('JOHN')).toBeInTheDocument();
    expect(screen.getByText('MARY')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Filter elements...');
    await user.type(input, 'john');

    expect(screen.getByText('JOHN')).toBeInTheDocument();
    expect(screen.queryByText('MARY')).not.toBeInTheDocument();
  });

  it('clearing filter shows all elements again', async () => {
    const user = userEvent.setup();

    render(<ElementList elements={mockElements} onArchive={mockOnArchive} />);

    const input = screen.getByPlaceholderText('Filter elements...');
    await user.type(input, 'john');
    expect(screen.queryByText('MARY')).not.toBeInTheDocument();

    await user.clear(input);
    expect(screen.getByText('MARY')).toBeInTheDocument();
    expect(screen.getByText('JOHN')).toBeInTheDocument();
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

    expect(mockOnArchive).toHaveBeenCalledWith('elem-3');
    expect(onElementClick).not.toHaveBeenCalled();
  });
});
