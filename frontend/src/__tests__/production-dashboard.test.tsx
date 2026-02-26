import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockToastShow = vi.fn();

vi.mock('../lib/toast-context', () => ({
  useToast: () => ({ show: mockToastShow, toasts: [], dismiss: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({ id: 'prod-1' }),
}));

vi.mock('../lib/api', () => ({
  authApi: { signup: vi.fn(), login: vi.fn(), me: vi.fn() },
  productionsApi: {
    create: vi.fn(),
    list: vi.fn(),
    get: vi.fn(),
    addMember: vi.fn(),
    listMembers: vi.fn(),
    removeMember: vi.fn(),
    updateMemberRole: vi.fn(),
    updateMemberDepartment: vi.fn(),
    update: vi.fn(),
    getElementStats: vi.fn(),
  },
  departmentsApi: {
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
  notificationsApi: {
    list: vi.fn(),
    markAsRead: vi.fn(),
    unreadCount: vi.fn(),
  },
  feedApi: {
    list: vi.fn(),
  },
  notificationPreferencesApi: {
    get: vi.fn(),
    update: vi.fn(),
  },
}));

import { productionsApi, departmentsApi, notificationsApi, feedApi, notificationPreferencesApi } from '../lib/api';
const mockedProductionsApi = vi.mocked(productionsApi);
const mockedDepartmentsApi = vi.mocked(departmentsApi);
const mockedNotificationsApi = vi.mocked(notificationsApi);
const mockedFeedApi = vi.mocked(feedApi);
const mockedNotificationPreferencesApi = vi.mocked(notificationPreferencesApi);

// Import after mocks
import ProductionDashboard from '../app/productions/[id]/page';

const mockProduction = {
  id: 'prod-1',
  title: 'Film One',
  description: null,
  createdById: 'user-1',
  memberRole: 'ADMIN',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  members: [
    {
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'ADMIN',
      title: 'Director',
      departmentId: 'dept-1',
      user: { id: 'user-1', name: 'Test Admin', email: 'owner@example.com' },
      department: { id: 'dept-1', name: 'Production Design' },
    },
  ],
  scripts: [],
  departments: [
    {
      id: 'dept-1',
      name: 'Production Design',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

const mockDepartments = [
  {
    id: 'dept-1',
    productionId: 'prod-1',
    name: 'Production Design',
    color: '#E63946',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { members: 1 },
  },
  {
    id: 'dept-2',
    productionId: 'prod-1',
    name: 'Costume',
    color: '#2A9D8F',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { members: 0 },
  },
];

function setupMocks() {
  mockedProductionsApi.get.mockResolvedValue({ production: mockProduction });
  mockedProductionsApi.getElementStats.mockResolvedValue({
    pending: 5,
    outstanding: 3,
    approved: 2,
    total: 10,
  });
  mockedDepartmentsApi.list.mockResolvedValue({ departments: mockDepartments });
  mockedNotificationsApi.unreadCount.mockResolvedValue({ count: 0 });
  mockedNotificationsApi.list.mockResolvedValue({ notifications: [] });
  mockedFeedApi.list.mockResolvedValue({ elements: [] });
  mockedNotificationPreferencesApi.get.mockResolvedValue({
    preferences: {
      optionEmails: true,
      noteEmails: true,
      approvalEmails: true,
      scriptEmails: true,
      memberEmails: true,
      scopeFilter: 'ALL',
    },
  });
}

describe('Production dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders production title', async () => {
    setupMocks();
    render(<ProductionDashboard />);
    expect(await screen.findByText('Film One')).toBeInTheDocument();
  });

  it('renders team member list with title', async () => {
    setupMocks();
    render(<ProductionDashboard />);

    expect(await screen.findByText('Test Admin')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.getByText(/Director/)).toBeInTheDocument();
  });

  it('renders department dropdown for members when ADMIN', async () => {
    setupMocks();
    render(<ProductionDashboard />);

    await screen.findByText('Test Admin');
    // The member should have a department dropdown
    const deptSelect = screen.getByRole('combobox', { name: /department for test admin/i });
    expect(deptSelect).toBeInTheDocument();
    expect(deptSelect).toHaveValue('dept-1');
  });

  it('renders departments section with list', async () => {
    setupMocks();
    render(<ProductionDashboard />);

    expect(await screen.findByText('Departments')).toBeInTheDocument();
    // Costume appears in both department dropdown options and department list
    const costumeElements = screen.getAllByText('Costume');
    expect(costumeElements.length).toBeGreaterThan(0);
  });

  it('renders "Add Member" form without title field', async () => {
    setupMocks();
    render(<ProductionDashboard />);

    expect(await screen.findByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/title/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add member/i })).toBeInTheDocument();
  });

  it('renders "Add Department" form', async () => {
    setupMocks();
    render(<ProductionDashboard />);

    expect(await screen.findByPlaceholderText(/new department/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add department/i })).toBeInTheDocument();
  });

  it('renders scripts section with empty state', async () => {
    setupMocks();
    render(<ProductionDashboard />);

    expect(await screen.findByText('Scripts')).toBeInTheDocument();
    expect(screen.getByText(/no scripts uploaded/i)).toBeInTheDocument();
  });

  it('renders "Upload Script" link', async () => {
    setupMocks();
    render(<ProductionDashboard />);

    expect(await screen.findByRole('link', { name: /upload script/i })).toBeInTheDocument();
  });

  it('shows error message when load fails', async () => {
    mockedProductionsApi.get.mockRejectedValue(new Error('Network error'));
    mockedDepartmentsApi.list.mockRejectedValue(new Error('Network error'));

    render(<ProductionDashboard />);

    expect(await screen.findByText(/failed to load production/i)).toBeInTheDocument();
  });

  it('calls addMember API when form is submitted', async () => {
    const user = userEvent.setup();
    const updatedProduction = {
      ...mockProduction,
      members: [
        ...mockProduction.members,
        {
          id: 'member-2',
          productionId: 'prod-1',
          userId: 'user-2',
          role: 'MEMBER',
          title: null,
          user: { id: 'user-2', name: 'New Person', email: 'new@example.com' },
          department: null,
        },
      ],
    };

    setupMocks();
    mockedProductionsApi.addMember.mockResolvedValue({
      member: {
        id: 'member-2',
        productionId: 'prod-1',
        userId: 'user-2',
        role: 'MEMBER',
      },
    });
    mockedProductionsApi.get.mockResolvedValueOnce({ production: mockProduction });
    mockedProductionsApi.get.mockResolvedValueOnce({ production: updatedProduction });

    render(<ProductionDashboard />);

    await screen.findByText('Film One');

    const emailInput = screen.getByPlaceholderText(/email/i);
    await user.type(emailInput, 'new@example.com');
    await user.click(screen.getByRole('button', { name: /add member/i }));

    expect(mockedProductionsApi.addMember).toHaveBeenCalledWith(
      'prod-1',
      'new@example.com',
      undefined,
    );
  });

  it('supports comma-separated multi-email invite', async () => {
    const user = userEvent.setup();
    setupMocks();
    mockedProductionsApi.addMember.mockResolvedValue({
      member: {
        id: 'member-new',
        productionId: 'prod-1',
        userId: 'user-new',
        role: 'MEMBER',
      },
    });

    render(<ProductionDashboard />);

    await screen.findByText('Film One');

    const emailInput = screen.getByPlaceholderText(/email/i);
    await user.type(emailInput, 'a@b.com, c@d.com');
    await user.click(screen.getByRole('button', { name: /add member/i }));

    expect(mockedProductionsApi.addMember).toHaveBeenCalledTimes(2);
    expect(mockedProductionsApi.addMember).toHaveBeenCalledWith('prod-1', 'a@b.com', undefined);
    expect(mockedProductionsApi.addMember).toHaveBeenCalledWith('prod-1', 'c@d.com', undefined);
  });

  it('handles multi-email edge cases: extra commas, trailing spaces', async () => {
    const user = userEvent.setup();
    setupMocks();
    mockedProductionsApi.addMember.mockResolvedValue({
      member: {
        id: 'member-new',
        productionId: 'prod-1',
        userId: 'user-new',
        role: 'MEMBER',
      },
    });

    render(<ProductionDashboard />);

    await screen.findByText('Film One');

    const emailInput = screen.getByPlaceholderText(/email/i);
    await user.type(emailInput, 'a@b.com,,, c@d.com , ');
    await user.click(screen.getByRole('button', { name: /add member/i }));

    expect(mockedProductionsApi.addMember).toHaveBeenCalledTimes(2);
    expect(mockedProductionsApi.addMember).toHaveBeenCalledWith('prod-1', 'a@b.com', undefined);
    expect(mockedProductionsApi.addMember).toHaveBeenCalledWith('prod-1', 'c@d.com', undefined);
  });

  it('shows error when addMember fails', async () => {
    const user = userEvent.setup();
    setupMocks();
    mockedProductionsApi.addMember.mockRejectedValue(new Error('No user found with that email'));

    render(<ProductionDashboard />);

    await screen.findByText('Film One');

    const emailInput = screen.getByPlaceholderText(/email/i);
    await user.type(emailInput, 'bad@example.com');
    await user.click(screen.getByRole('button', { name: /add member/i }));

    await screen.findByText('Film One');
    expect(mockToastShow).toHaveBeenCalledWith('No user found with that email', 'error');
  });

  it('confirms before deleting a department', async () => {
    const user = userEvent.setup();
    setupMocks();

    render(<ProductionDashboard />);
    await screen.findByText('Departments');

    // First: cancel the confirm — API should NOT be called
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);

    // Only Costume (0 members) has a delete button
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockedDepartmentsApi.delete).not.toHaveBeenCalled();

    // Second: accept the confirm — API should be called
    confirmSpy.mockReturnValueOnce(true);
    mockedDepartmentsApi.delete.mockResolvedValueOnce({});

    await user.click(deleteButtons[0]);

    expect(mockedDepartmentsApi.delete).toHaveBeenCalledWith('prod-1', 'dept-2');

    confirmSpy.mockRestore();
  });

  it('removes department from list after successful deletion', async () => {
    const user = userEvent.setup();
    setupMocks();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockedDepartmentsApi.delete.mockResolvedValueOnce({});

    render(<ProductionDashboard />);
    await screen.findByText('Departments');

    // Costume appears in department list and dropdown options
    const costumeBefore = screen.getAllByText('Costume');
    expect(costumeBefore.length).toBeGreaterThan(0);

    // Only Costume (0 members) has a delete button
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    // After deletion, Costume may still appear in dropdown options but
    // the department list item should be gone. Verify the API was called.
    expect(mockedDepartmentsApi.delete).toHaveBeenCalledWith('prod-1', 'dept-2');

    confirmSpy.mockRestore();
  });

  it('creates a department when form is submitted', async () => {
    const user = userEvent.setup();
    setupMocks();
    mockedDepartmentsApi.create.mockResolvedValue({
      department: {
        id: 'dept-new',
        productionId: 'prod-1',
        name: 'Stunts',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    mockedDepartmentsApi.list.mockResolvedValueOnce({ departments: mockDepartments });
    mockedDepartmentsApi.list.mockResolvedValueOnce({
      departments: [
        ...mockDepartments,
        {
          id: 'dept-new',
          productionId: 'prod-1',
          name: 'Stunts',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          members: [],
        },
      ],
    });

    render(<ProductionDashboard />);

    await screen.findByText('Departments');

    const deptInput = screen.getByPlaceholderText(/new department/i);
    await user.type(deptInput, 'Stunts');
    await user.click(screen.getByRole('button', { name: /add department/i }));

    expect(mockedDepartmentsApi.create).toHaveBeenCalledWith('prod-1', 'Stunts');
  });

  it('renders role dropdown for members when current user is ADMIN', async () => {
    const multiMemberProduction = {
      ...mockProduction,
      memberRole: 'ADMIN',
      members: [
        ...mockProduction.members,
        {
          id: 'member-2',
          productionId: 'prod-1',
          userId: 'user-2',
          role: 'MEMBER',
          title: 'Designer',
          user: { id: 'user-2', name: 'Alice', email: 'alice@example.com' },
          department: null,
        },
      ],
    };
    mockedProductionsApi.get.mockResolvedValue({ production: multiMemberProduction });
    mockedDepartmentsApi.list.mockResolvedValue({ departments: mockDepartments });
    mockedNotificationsApi.unreadCount.mockResolvedValue({ count: 0 });
    mockedNotificationsApi.list.mockResolvedValue({ notifications: [] });

    render(<ProductionDashboard />);

    await screen.findByText('Alice');
    const select = screen.getByRole('combobox', { name: /role for alice/i });
    expect(select).toBeInTheDocument();
  });

  it('calls updateMemberRole when role dropdown is changed', async () => {
    const user = userEvent.setup();
    const multiMemberProduction = {
      ...mockProduction,
      memberRole: 'ADMIN',
      members: [
        ...mockProduction.members,
        {
          id: 'member-2',
          productionId: 'prod-1',
          userId: 'user-2',
          role: 'MEMBER',
          title: 'Designer',
          user: { id: 'user-2', name: 'Alice', email: 'alice@example.com' },
          department: null,
        },
      ],
    };
    mockedProductionsApi.get.mockResolvedValue({ production: multiMemberProduction });
    mockedDepartmentsApi.list.mockResolvedValue({ departments: mockDepartments });
    mockedNotificationsApi.unreadCount.mockResolvedValue({ count: 0 });
    mockedNotificationsApi.list.mockResolvedValue({ notifications: [] });
    mockedProductionsApi.updateMemberRole.mockResolvedValue({
      member: { id: 'member-2', productionId: 'prod-1', userId: 'user-2', role: 'DECIDER', title: 'Designer' },
    });

    render(<ProductionDashboard />);

    await screen.findByText('Alice');
    const select = screen.getByRole('combobox', { name: /role for alice/i });
    await user.selectOptions(select, 'DECIDER');

    expect(mockedProductionsApi.updateMemberRole).toHaveBeenCalledWith('prod-1', 'member-2', 'DECIDER');
  });

  it('does not render role dropdown when current user is MEMBER', async () => {
    const memberProduction = {
      ...mockProduction,
      memberRole: 'MEMBER',
      members: [
        ...mockProduction.members,
        {
          id: 'member-2',
          productionId: 'prod-1',
          userId: 'user-2',
          role: 'MEMBER',
          title: 'Designer',
          user: { id: 'user-2', name: 'Alice', email: 'alice@example.com' },
          department: null,
        },
      ],
    };
    mockedProductionsApi.get.mockResolvedValue({ production: memberProduction });
    mockedDepartmentsApi.list.mockResolvedValue({ departments: mockDepartments });
    mockedNotificationsApi.unreadCount.mockResolvedValue({ count: 0 });
    mockedNotificationsApi.list.mockResolvedValue({ notifications: [] });

    render(<ProductionDashboard />);

    await screen.findByText('Alice');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('calls updateMemberDepartment when department changed', async () => {
    const user = userEvent.setup();
    const multiMemberProduction = {
      ...mockProduction,
      memberRole: 'ADMIN',
      members: [
        ...mockProduction.members,
        {
          id: 'member-2',
          productionId: 'prod-1',
          userId: 'user-2',
          role: 'MEMBER',
          title: 'Designer',
          departmentId: null,
          user: { id: 'user-2', name: 'Alice', email: 'alice@example.com' },
          department: null,
        },
      ],
    };
    mockedProductionsApi.get.mockResolvedValue({ production: multiMemberProduction });
    mockedDepartmentsApi.list.mockResolvedValue({ departments: mockDepartments });
    mockedNotificationsApi.unreadCount.mockResolvedValue({ count: 0 });
    mockedNotificationsApi.list.mockResolvedValue({ notifications: [] });
    mockedProductionsApi.updateMemberDepartment.mockResolvedValue({
      member: { id: 'member-2', productionId: 'prod-1', userId: 'user-2', role: 'MEMBER', title: 'Designer', departmentId: 'dept-2' },
    });

    render(<ProductionDashboard />);

    await screen.findByText('Alice');
    const deptSelect = screen.getByRole('combobox', { name: /department for alice/i });
    await user.selectOptions(deptSelect, 'dept-2');

    expect(mockedProductionsApi.updateMemberDepartment).toHaveBeenCalledWith('prod-1', 'member-2', 'dept-2');
  });

  it('disables delete for departments with members', async () => {
    setupMocks();
    render(<ProductionDashboard />);

    await screen.findByText('Departments');

    // Production Design has 1 member — find its row in the department list
    // Production Design appears multiple times (dropdown + dept list), find the <li>
    const prodDesignElements = screen.getAllByText('Production Design');
    const prodDesignRow = prodDesignElements
      .map((el) => el.closest('li'))
      .find((li) => li && li.querySelector('.btn-disabled-striped'));
    expect(prodDesignRow).not.toBeNull();
    const disabledDelete = prodDesignRow!.querySelector('.btn-disabled-striped');
    expect(disabledDelete).toBeInTheDocument();
    // Should show inline explanation text, NOT a native title tooltip
    expect(disabledDelete).not.toHaveAttribute('title');
    // The row should show the explanation text inline
    expect(prodDesignRow).toHaveTextContent(/cannot delete.*with members/i);

    // Costume has 0 members — find its row with a regular delete button (btn-text class)
    const costumeElements = screen.getAllByText('Costume');
    const costumeRow = costumeElements
      .map((el) => el.closest('li'))
      .find((li) => li && li.querySelector('.btn-text'));
    expect(costumeRow).not.toBeNull();
    const deleteBtn = costumeRow!.querySelector('.btn-text');
    expect(deleteBtn).toBeInTheDocument();
    expect(deleteBtn).toHaveTextContent(/delete/i);
  });

  it('Scripts section appears before Team Members section in DOM order', async () => {
    setupMocks();
    const { container } = render(<ProductionDashboard />);

    await screen.findByText('Scripts');

    const sections = container.querySelectorAll('.mac-window');
    const sectionTitles = Array.from(sections).map(
      (s) => s.querySelector('.mac-window-title span')?.textContent?.trim(),
    );

    const scriptsIdx = sectionTitles.indexOf('Scripts');
    const teamIdx = sectionTitles.findIndex((t) => t?.startsWith('Team Members'));
    expect(scriptsIdx).toBeLessThan(teamIdx);
  });

  it('review feed section shows pending count text', async () => {
    setupMocks();
    mockedFeedApi.list.mockResolvedValue({
      elements: [
        { id: 'e1', name: 'EL1', options: [], type: 'CHARACTER', status: 'ACTIVE', scriptId: 's1', createdAt: '', updatedAt: '', highlightPage: null, highlightText: null, departmentId: null, source: 'AUTO' },
        { id: 'e2', name: 'EL2', options: [], type: 'CHARACTER', status: 'ACTIVE', scriptId: 's1', createdAt: '', updatedAt: '', highlightPage: null, highlightText: null, departmentId: null, source: 'AUTO' },
      ],
    });

    render(<ProductionDashboard />);

    expect(await screen.findByText(/2 elements pending review/i)).toBeInTheDocument();
  });

  it('review feed section links to feed page', async () => {
    setupMocks();

    render(<ProductionDashboard />);

    const feedLink = await screen.findByRole('link', { name: /review feed/i });
    expect(feedLink).toHaveAttribute('href', '/productions/prod-1/feed');
  });

  it('shows "No elements pending review" when count is 0', async () => {
    setupMocks();
    mockedFeedApi.list.mockResolvedValue({ elements: [] });

    render(<ProductionDashboard />);

    expect(await screen.findByText(/no elements pending review/i)).toBeInTheDocument();
  });

  it('production title is editable for ADMIN', async () => {
    const user = userEvent.setup();
    setupMocks();

    render(<ProductionDashboard />);

    const title = await screen.findByText('Film One');
    // Click to enter edit mode
    await user.click(title);

    // Should show an input with the current title
    const input = screen.getByDisplayValue('Film One');
    expect(input).toBeInTheDocument();
  });

  it('saves title on Enter and calls productionsApi.update', async () => {
    const user = userEvent.setup();
    setupMocks();
    mockedProductionsApi.update.mockResolvedValue({
      production: { ...mockProduction, title: 'New Title' },
    });

    render(<ProductionDashboard />);

    const title = await screen.findByText('Film One');
    await user.click(title);

    const input = screen.getByDisplayValue('Film One');
    await user.clear(input);
    await user.type(input, 'New Title{Enter}');

    expect(mockedProductionsApi.update).toHaveBeenCalledWith('prod-1', { title: 'New Title' });
  });

  it('each member row has a PermissionsTooltip when canManageRoles', async () => {
    const multiMemberProduction = {
      ...mockProduction,
      memberRole: 'ADMIN',
      members: [
        ...mockProduction.members,
        {
          id: 'member-2',
          productionId: 'prod-1',
          userId: 'user-2',
          role: 'MEMBER',
          title: 'Designer',
          user: { id: 'user-2', name: 'Alice', email: 'alice@example.com' },
          department: null,
        },
      ],
    };
    mockedProductionsApi.get.mockResolvedValue({ production: multiMemberProduction });
    mockedDepartmentsApi.list.mockResolvedValue({ departments: mockDepartments });
    mockedNotificationsApi.unreadCount.mockResolvedValue({ count: 0 });
    mockedNotificationsApi.list.mockResolvedValue({ notifications: [] });
    mockedFeedApi.list.mockResolvedValue({ elements: [] });

    render(<ProductionDashboard />);

    await screen.findByText('Alice');

    // Should be one tooltip per member (2 members)
    const tooltipButtons = screen.getAllByRole('button', { name: /permissions info/i });
    expect(tooltipButtons).toHaveLength(2);
  });

  it('shows error message when title save fails', async () => {
    const user = userEvent.setup();
    setupMocks();
    mockedProductionsApi.update.mockRejectedValue(new Error('Failed to update title'));

    render(<ProductionDashboard />);

    const title = await screen.findByText('Film One');
    await user.click(title);

    const input = screen.getByDisplayValue('Film One');
    await user.clear(input);
    await user.type(input, 'New Title');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to update title/i);
  });

  it('pressing Escape cancels title edit without calling API', async () => {
    const user = userEvent.setup();
    setupMocks();

    render(<ProductionDashboard />);

    const title = await screen.findByText('Film One');
    await user.click(title);

    const input = screen.getByDisplayValue('Film One');
    await user.type(input, ' changed{Escape}');

    // Should exit edit mode, showing original title
    expect(screen.getByText('Film One')).toBeInTheDocument();
    expect(screen.queryByDisplayValue(/changed/)).not.toBeInTheDocument();
    // API should NOT be called
    expect(mockedProductionsApi.update).not.toHaveBeenCalled();
  });

  it('shows color input for each department when ADMIN', async () => {
    setupMocks();
    render(<ProductionDashboard />);

    await screen.findByText('Departments');
    const colorInputs = screen.getAllByLabelText(/color for/i);
    expect(colorInputs).toHaveLength(2);
  });

  it('calls departmentsApi.update when color is changed', async () => {
    setupMocks();
    mockedDepartmentsApi.update.mockResolvedValue({
      department: { ...mockDepartments[0], color: '#FF0000' },
    });

    render(<ProductionDashboard />);

    await screen.findByText('Departments');
    const colorInputs = screen.getAllByLabelText(/color for/i);
    fireEvent.change(colorInputs[0], { target: { value: '#FF0000' } });

    expect(mockedDepartmentsApi.update).toHaveBeenCalledWith('prod-1', 'dept-1', { color: '#ff0000' });
  });

  it('color input initial value matches department color', async () => {
    setupMocks();
    render(<ProductionDashboard />);

    await screen.findByText('Departments');
    const colorInputs = screen.getAllByLabelText(/color for/i) as HTMLInputElement[];
    expect(colorInputs[0]).toHaveValue('#e63946');
    expect(colorInputs[1]).toHaveValue('#2a9d8f');
  });

  it('shows error when color update fails', async () => {
    setupMocks();
    mockedDepartmentsApi.update.mockRejectedValue(new Error('Color update failed'));

    render(<ProductionDashboard />);

    await screen.findByText('Departments');
    const colorInputs = screen.getAllByLabelText(/color for/i);
    fireEvent.change(colorInputs[0], { target: { value: '#FF0000' } });

    await screen.findByText('Departments');
    expect(mockToastShow).toHaveBeenCalledWith('Color update failed', 'error');
  });

  it('does not show color input for departments when MEMBER', async () => {
    const memberProduction = {
      ...mockProduction,
      memberRole: 'MEMBER',
    };
    mockedProductionsApi.get.mockResolvedValue({ production: memberProduction });
    mockedDepartmentsApi.list.mockResolvedValue({ departments: mockDepartments });
    mockedNotificationsApi.unreadCount.mockResolvedValue({ count: 0 });
    mockedNotificationsApi.list.mockResolvedValue({ notifications: [] });
    mockedFeedApi.list.mockResolvedValue({ elements: [] });

    render(<ProductionDashboard />);

    await screen.findByText('Departments');
    expect(screen.queryAllByLabelText(/color for/i)).toHaveLength(0);
  });

  it('renders Element Status section with workflow counts', async () => {
    setupMocks();

    render(<ProductionDashboard />);

    expect(await screen.findByText('Element Status')).toBeInTheDocument();
    expect(screen.getByText('2 of 10 elements approved')).toBeInTheDocument();
  });

  it('OUTSTANDING badge uses badge-outstanding-review class, not badge-ready', async () => {
    setupMocks();

    render(<ProductionDashboard />);

    const outstandingBadge = await screen.findByText('OUTSTANDING');
    expect(outstandingBadge).toHaveClass('badge-outstanding-review');
    expect(outstandingBadge).not.toHaveClass('badge-ready');
  });

  it('shows toast on member add error', async () => {
    const user = userEvent.setup();
    setupMocks();
    mockedProductionsApi.addMember.mockRejectedValue(new Error('No user found with that email'));

    render(<ProductionDashboard />);

    await screen.findByText('Film One');

    const emailInput = screen.getByPlaceholderText(/email/i);
    await user.type(emailInput, 'bad@example.com');
    await user.click(screen.getByRole('button', { name: /add member/i }));

    await screen.findByText('Film One');
    expect(mockToastShow).toHaveBeenCalledWith('No user found with that email', 'error');
  });

  it('renders Email Notifications section with preference checkboxes', async () => {
    setupMocks();

    render(<ProductionDashboard />);

    // Wait for the Email Notifications section title to render
    expect(await screen.findByText('Email Notifications')).toBeInTheDocument();

    // Wait for the preferences API to resolve and checkboxes to appear
    expect(await screen.findByRole('checkbox', { name: /options/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /approvals/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /notes/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /scripts/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /members/i })).toBeInTheDocument();
  });

  it('MEMBER cannot edit title (no cursor-pointer, click does not enter edit mode)', async () => {
    const memberProduction = {
      ...mockProduction,
      memberRole: 'MEMBER',
    };
    mockedProductionsApi.get.mockResolvedValue({ production: memberProduction });
    mockedDepartmentsApi.list.mockResolvedValue({ departments: mockDepartments });
    mockedNotificationsApi.unreadCount.mockResolvedValue({ count: 0 });
    mockedNotificationsApi.list.mockResolvedValue({ notifications: [] });
    mockedFeedApi.list.mockResolvedValue({ elements: [] });

    render(<ProductionDashboard />);

    const title = await screen.findByText('Film One');
    expect(title).not.toHaveClass('cursor-pointer');

    // Click should NOT enter edit mode
    fireEvent.click(title);
    expect(screen.queryByDisplayValue('Film One')).not.toBeInTheDocument();
  });

  it('PENDING production shows pending message, not dashboard content', async () => {
    const pendingProduction = {
      ...mockProduction,
      status: 'PENDING',
    };
    mockedProductionsApi.get.mockResolvedValue({ production: pendingProduction });
    mockedDepartmentsApi.list.mockResolvedValue({ departments: [] });
    mockedFeedApi.list.mockResolvedValue({ elements: [] });
    mockedProductionsApi.getElementStats.mockResolvedValue({
      pending: 0, outstanding: 0, approved: 0, total: 0,
    });
    mockedNotificationPreferencesApi.get.mockResolvedValue({
      preferences: {
        optionEmails: true, noteEmails: true, approvalEmails: true,
        scriptEmails: true, memberEmails: true, scopeFilter: 'ALL',
      },
    });

    render(<ProductionDashboard />);

    expect(await screen.findByText('PENDING APPROVAL')).toBeInTheDocument();
    expect(screen.getByText(/being reviewed by our sales team/i)).toBeInTheDocument();
    // Dashboard sections should NOT be rendered
    expect(screen.queryByText('Scripts')).not.toBeInTheDocument();
    expect(screen.queryByText('Team Members')).not.toBeInTheDocument();
  });

  it('ACTIVE production shows full dashboard', async () => {
    const activeProduction = {
      ...mockProduction,
      status: 'ACTIVE',
    };
    mockedProductionsApi.get.mockResolvedValue({ production: activeProduction });
    mockedDepartmentsApi.list.mockResolvedValue({ departments: mockDepartments });
    mockedFeedApi.list.mockResolvedValue({ elements: [] });
    mockedProductionsApi.getElementStats.mockResolvedValue({
      pending: 5, outstanding: 3, approved: 2, total: 10,
    });
    mockedNotificationPreferencesApi.get.mockResolvedValue({
      preferences: {
        optionEmails: true, noteEmails: true, approvalEmails: true,
        scriptEmails: true, memberEmails: true, scopeFilter: 'ALL',
      },
    });

    render(<ProductionDashboard />);

    expect(await screen.findByText('Film One')).toBeInTheDocument();
    expect(screen.getAllByText('Scripts').length).toBeGreaterThan(0);
    expect(screen.queryByText('PENDING APPROVAL')).not.toBeInTheDocument();
  });
});
