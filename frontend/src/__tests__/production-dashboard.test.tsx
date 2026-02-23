import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  },
  departmentsApi: {
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
  },
  notificationsApi: {
    list: vi.fn(),
    markAsRead: vi.fn(),
    unreadCount: vi.fn(),
  },
}));

import { productionsApi, departmentsApi, notificationsApi } from '../lib/api';
const mockedProductionsApi = vi.mocked(productionsApi);
const mockedDepartmentsApi = vi.mocked(departmentsApi);
const mockedNotificationsApi = vi.mocked(notificationsApi);

// Import after mocks
import ProductionDashboard from '../app/productions/[id]/page';

const mockProduction = {
  id: 'prod-1',
  title: 'Film One',
  description: null,
  createdById: 'user-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  members: [
    {
      id: 'member-1',
      productionId: 'prod-1',
      userId: 'user-1',
      role: 'OWNER',
      title: 'Director',
      user: { id: 'user-1', name: 'Test Owner', email: 'owner@example.com' },
      departmentMembers: [{ department: { id: 'dept-1', name: 'Art' } }],
    },
  ],
  scripts: [],
  departments: [
    {
      id: 'dept-1',
      name: 'Art',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

const mockDepartments = [
  {
    id: 'dept-1',
    productionId: 'prod-1',
    name: 'Art',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [],
  },
  {
    id: 'dept-2',
    productionId: 'prod-1',
    name: 'Costume',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [],
  },
];

function setupMocks() {
  mockedProductionsApi.get.mockResolvedValue({ production: mockProduction });
  mockedDepartmentsApi.list.mockResolvedValue({ departments: mockDepartments });
  mockedNotificationsApi.unreadCount.mockResolvedValue({ count: 0 });
  mockedNotificationsApi.list.mockResolvedValue({ notifications: [] });
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

    expect(await screen.findByText('Test Owner')).toBeInTheDocument();
    expect(screen.getByText('OWNER')).toBeInTheDocument();
    expect(screen.getByText(/Director/)).toBeInTheDocument();
  });

  it('renders department badges on members', async () => {
    setupMocks();
    render(<ProductionDashboard />);

    await screen.findByText('Test Owner');
    // The member has department badge "Art"
    const badges = screen.getAllByText('Art');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('renders departments section with list', async () => {
    setupMocks();
    render(<ProductionDashboard />);

    expect(await screen.findByText('Departments')).toBeInTheDocument();
    expect(screen.getByText('Costume')).toBeInTheDocument();
  });

  it('renders "Add Member" form with title field', async () => {
    setupMocks();
    render(<ProductionDashboard />);

    expect(await screen.findByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/title/i)).toBeInTheDocument();
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

  it('calls addMember API with title when form is submitted', async () => {
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
          title: 'Costume Designer',
          user: { id: 'user-2', name: 'New Person', email: 'new@example.com' },
          departmentMembers: [],
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
        title: 'Costume Designer',
      },
    });
    mockedProductionsApi.get.mockResolvedValueOnce({ production: mockProduction });
    mockedProductionsApi.get.mockResolvedValueOnce({ production: updatedProduction });

    render(<ProductionDashboard />);

    await screen.findByText('Film One');

    const emailInput = screen.getByPlaceholderText(/email/i);
    const titleInput = screen.getByPlaceholderText(/title/i);
    await user.type(emailInput, 'new@example.com');
    await user.type(titleInput, 'Costume Designer');
    await user.click(screen.getByRole('button', { name: /add member/i }));

    expect(mockedProductionsApi.addMember).toHaveBeenCalledWith(
      'prod-1',
      'new@example.com',
      'Costume Designer',
    );
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

    expect(await screen.findByRole('alert')).toHaveTextContent(/no user found/i);
  });

  it('confirms before deleting a department', async () => {
    const user = userEvent.setup();
    setupMocks();

    render(<ProductionDashboard />);
    await screen.findByText('Departments');

    // First: cancel the confirm — API should NOT be called
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockedDepartmentsApi.delete).not.toHaveBeenCalled();

    // Second: accept the confirm — API should be called
    confirmSpy.mockReturnValueOnce(true);
    mockedDepartmentsApi.delete.mockResolvedValueOnce({});

    await user.click(deleteButtons[0]);

    expect(mockedDepartmentsApi.delete).toHaveBeenCalledWith('prod-1', 'dept-1');

    confirmSpy.mockRestore();
  });

  it('removes department from list after successful deletion', async () => {
    const user = userEvent.setup();
    setupMocks();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockedDepartmentsApi.delete.mockResolvedValueOnce({});

    render(<ProductionDashboard />);
    await screen.findByText('Departments');

    expect(screen.getByText('Costume')).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    // Delete Costume (second item, index 1)
    await user.click(deleteButtons[1]);

    // Costume should be removed from the DOM
    expect(screen.queryByText('Costume')).not.toBeInTheDocument();

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
});
