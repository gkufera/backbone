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

  it('active element Link has text-white class for visibility on dark background', () => {
    render(
      <ElementList
        elements={mockElements}
        onArchive={mockOnArchive}
        productionId="prod-1"
        scriptId="script-1"
        activeElementId="elem-1"
      />,
    );

    const link = screen.getByRole('link', { name: 'JOHN' });
    expect(link).toHaveClass('text-white');
  });

  it('active sort button has bg-black and text-white classes', () => {
    render(<ElementList elements={mockElements} onArchive={mockOnArchive} />);

    const appearanceBtn = screen.getByRole('button', { name: /by appearance/i });
    expect(appearanceBtn.className).toContain('bg-black');
    expect(appearanceBtn.className).toContain('text-white');
    expect(appearanceBtn.className).toContain('border-2');
  });

  it('active department filter "All" chip has bg-black and text-white classes', () => {
    const elementsWithDepts = [
      {
        ...mockElements[0],
        department: { id: 'dept-cast', name: 'Cast', color: '#E63946' },
      },
    ];

    render(<ElementList elements={elementsWithDepts} onArchive={mockOnArchive} />);

    // "All" button is active by default
    const allBtn = screen.getByRole('button', { name: /all/i });
    expect(allBtn.className).toContain('bg-black');
    expect(allBtn.className).toContain('text-white');
    expect(allBtn.className).toContain('border-2');
  });

  it('clicking department chip gives it bg-black class and removes it from All', async () => {
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

    render(<ElementList elements={elementsWithDepts} onArchive={mockOnArchive} />);

    const castBtn = screen.getByRole('button', { name: /cast/i });
    await user.click(castBtn);

    expect(castBtn.className).toContain('bg-black');
    expect(castBtn.className).toContain('text-white');

    const allBtn = screen.getByRole('button', { name: /all/i });
    expect(allBtn.className).toContain('bg-white');
    expect(allBtn.className).toContain('text-black');
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

  it('renders distinct glyphs for each temperature state', () => {
    const elementsWithAllTemps = [
      { ...mockElements[0], approvalTemperature: 'green' as const },
      { ...mockElements[1], approvalTemperature: 'yellow' as const },
      { ...mockElements[2], approvalTemperature: 'red' as const },
    ];

    const { container } = render(
      <ElementList elements={elementsWithAllTemps} onArchive={mockOnArchive} />,
    );

    const greenIndicator = container.querySelector('.temp-green');
    const yellowIndicator = container.querySelector('.temp-yellow');
    const redIndicator = container.querySelector('.temp-red');

    expect(greenIndicator).toBeInTheDocument();
    expect(greenIndicator?.textContent).toBe('●');
    expect(yellowIndicator).toBeInTheDocument();
    expect(yellowIndicator?.textContent).toBe('◐');
    expect(redIndicator).toBeInTheDocument();
    expect(redIndicator?.textContent).toBe('○');
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

  it('By Department groups sort elements by appearance within each group', async () => {
    const user = userEvent.setup();
    // Note: MARY (page 3) comes BEFORE JOHN (page 1) in input array
    // to prove sorting happens within the group
    const elementsWithDepts = [
      {
        ...mockElements[3], // MAGIC RING, page 7
        department: { id: 'dept-props', name: 'Props', color: '#264653' },
      },
      {
        ...mockElements[1], // MARY, page 3
        department: { id: 'dept-cast', name: 'Cast', color: '#E63946' },
      },
      {
        ...mockElements[0], // JOHN, page 1
        department: { id: 'dept-cast', name: 'Cast', color: '#E63946' },
      },
    ];

    render(<ElementList elements={elementsWithDepts} onArchive={mockOnArchive} />);

    await user.click(screen.getByRole('button', { name: /by department/i }));

    // Find the Cast group list
    const castList = screen.getByRole('list', { name: 'Cast' });
    const castItems = castList.querySelectorAll('li');
    // JOHN (page 1) should come before MARY (page 3) within the Cast group
    expect(castItems[0]).toHaveTextContent('JOHN');
    expect(castItems[1]).toHaveTextContent('MARY');
  });

  it('switching from By Department back to By Appearance works', async () => {
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

    render(<ElementList elements={elementsWithDepts} onArchive={mockOnArchive} />);

    // Switch to By Department
    await user.click(screen.getByRole('button', { name: /by department/i }));
    expect(screen.getByRole('heading', { level: 3, name: 'Cast' })).toBeInTheDocument();

    // Switch back to By Appearance
    await user.click(screen.getByRole('button', { name: /by appearance/i }));
    expect(screen.queryByRole('heading', { level: 3, name: 'Cast' })).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Elements sorted by appearance' })).toBeInTheDocument();
  });

  it('department group lists have aria-labels matching department name', async () => {
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
      {
        ...mockElements[3],
        // No department → Unassigned
      },
    ];

    render(<ElementList elements={elementsWithDepts} onArchive={mockOnArchive} />);

    await user.click(screen.getByRole('button', { name: /by department/i }));

    expect(screen.getByRole('list', { name: 'Cast' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Locations' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Unassigned' })).toBeInTheDocument();
  });

  it('renders element name as button (not Link) when onElementClick is provided', () => {
    const onElementClick = vi.fn();

    render(
      <ElementList
        elements={mockElements}
        onArchive={mockOnArchive}
        productionId="prod-1"
        scriptId="script-1"
        onElementClick={onElementClick}
      />,
    );

    // Should NOT have links for element names
    const links = screen.queryAllByRole('link');
    expect(links).toHaveLength(0);

    // Element name should be a button
    const nameButton = screen.getByRole('button', { name: 'JOHN' });
    expect(nameButton).toBeInTheDocument();
  });

  it('clicking element name button fires onElementClick callback', async () => {
    const user = userEvent.setup();
    const onElementClick = vi.fn();

    render(
      <ElementList
        elements={mockElements}
        onArchive={mockOnArchive}
        productionId="prod-1"
        scriptId="script-1"
        onElementClick={onElementClick}
      />,
    );

    const nameButton = screen.getByRole('button', { name: 'JOHN' });
    await user.click(nameButton);

    expect(onElementClick).toHaveBeenCalledWith('elem-1');
  });

  it('renders element name as Link when onElementClick is not provided', () => {
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
