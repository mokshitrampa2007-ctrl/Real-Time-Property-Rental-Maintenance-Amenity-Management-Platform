import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyApi, invitationApi } from '../../api/index.js';
import {
  Building2,
  Users,
  Plus,
  Copy,
  Check,
  Globe,
  ArrowLeft,
  Mail,
  UserCheck,
  UserX,
  Sparkles,
} from 'lucide-react';
import { Badge, StatusBadge } from '../../components/common/Badge.js';
import { Modal } from '../../components/common/Modal.js';
import { ConfirmModal } from '../../components/common/ConfirmModal.js';

export const PropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'units' | 'staff' | 'invitations'>('units');

  // Modals state
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Form states
  const [unitNumber, setUnitNumber] = useState('');
  const [floor, setFloor] = useState('1');
  const [unitDescription, setUnitDescription] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRoleTitle, setStaffRoleTitle] = useState('Maintenance Technician');
  const [inviteRole, setInviteRole] = useState<'TENANT' | 'STAFF'>('TENANT');
  const [inviteUnitId, setInviteUnitId] = useState('');
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Fetch Property Details
  const { data, isLoading } = useQuery({
    queryKey: ['properties', id],
    queryFn: () => propertyApi.getPropertyDetails(id!),
    enabled: !!id,
  });

  // Fetch Invitations
  const { data: inviteData } = useQuery({
    queryKey: ['invitations', id],
    queryFn: () => invitationApi.listByProperty(id!),
    enabled: !!id,
  });

  // Create Unit Mutation
  const createUnitMutation = useMutation({
    mutationFn: () =>
      propertyApi.createUnit(id!, {
        unitNumber,
        floor: parseInt(floor, 10),
        description: unitDescription,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', id] });
      setIsUnitModalOpen(false);
      setUnitNumber('');
      setUnitDescription('');
    },
    onError: (err: any) => setModalError(err.message),
  });

  // Assign Tenancy Mutation
  const assignTenancyMutation = useMutation({
    mutationFn: () =>
      propertyApi.assignTenancy(id!, {
        unitId: selectedUnitId,
        tenantEmail,
        startDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', id] });
      setIsAssignModalOpen(false);
      setTenantEmail('');
    },
    onError: (err: any) => setModalError(err.message),
  });

  // Add Staff Mutation
  const addStaffMutation = useMutation({
    mutationFn: () =>
      propertyApi.addStaff(id!, {
        staffEmail,
        roleTitle: staffRoleTitle,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', id] });
      setIsStaffModalOpen(false);
      setStaffEmail('');
    },
    onError: (err: any) => setModalError(err.message),
  });

  // Create Invitation Mutation
  const createInviteMutation = useMutation({
    mutationFn: () =>
      invitationApi.create(id!, {
        role: inviteRole,
        unitId: inviteRole === 'TENANT' ? inviteUnitId || undefined : undefined,
        expiresDays: 7,
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['invitations', id] });
      const fullUrl = `${window.location.origin}${res.invitationUrl}`;
      setGeneratedInviteLink(fullUrl);
    },
    onError: (err: any) => setModalError(err.message),
  });

  const handleCopyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const property = data?.property;
  if (!property) return <div className="text-center py-12">Property not found.</div>;

  const units = property.units || [];
  const staffMembers = property.staffMembers || [];
  const invitations = inviteData?.invitations || [];

  return (
    <div className="space-y-6">
      {/* Back button and Header */}
      <div>
        <Link
          to="/owner/properties"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Properties
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{property.name}</h1>
              <p className="text-xs text-slate-500 mt-0.5">{property.address}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
              <Globe className="w-3.5 h-3.5 text-slate-400 mr-1" />
              {property.timeZone}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('units')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'units'
              ? 'border-emerald-600 text-emerald-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Units & Tenancies ({units.length})
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'staff'
              ? 'border-emerald-600 text-emerald-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Maintenance Staff ({staffMembers.length})
        </button>
        <button
          onClick={() => setActiveTab('invitations')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'invitations'
              ? 'border-emerald-600 text-emerald-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Invitation Links ({invitations.length})
        </button>
      </div>

      {/* TAB 1: UNITS */}
      {activeTab === 'units' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">Assigned & Vacant Units</h3>
            <button
              onClick={() => {
                setModalError(null);
                setIsUnitModalOpen(true);
              }}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Unit
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Unit #</th>
                  <th className="px-5 py-3">Floor</th>
                  <th className="px-5 py-3">Occupancy Status</th>
                  <th className="px-5 py-3">Current Tenant</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {units.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                      No units added to this property yet.
                    </td>
                  </tr>
                ) : (
                  units.map((unit: any) => {
                    const activeTenancy = unit.tenancies?.[0];
                    return (
                      <tr key={unit.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3.5 font-bold text-slate-900">{unit.unitNumber}</td>
                        <td className="px-5 py-3.5 text-slate-500">Floor {unit.floor}</td>
                        <td className="px-5 py-3.5">
                          {activeTenancy ? (
                            <Badge variant="success">Occupied</Badge>
                          ) : (
                            <Badge variant="warning">Vacant</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {activeTenancy ? (
                            <div>
                              <p className="font-semibold text-slate-900">{activeTenancy.tenant?.name}</p>
                              <p className="text-[11px] text-slate-500">{activeTenancy.tenant?.email}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">None assigned</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {!activeTenancy && (
                            <button
                              onClick={() => {
                                setSelectedUnitId(unit.id);
                                setModalError(null);
                                setIsAssignModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition"
                            >
                              Assign Tenant
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">Authorized Maintenance Team</h3>
            <button
              onClick={() => {
                setModalError(null);
                setIsStaffModalOpen(true);
              }}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Staff Member
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Staff Name</th>
                  <th className="px-5 py-3">Role / Specialty</th>
                  <th className="px-5 py-3">Email Address</th>
                  <th className="px-5 py-3">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {staffMembers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                      No staff members assigned to this property yet.
                    </td>
                  </tr>
                ) : (
                  staffMembers.map((sm: any) => (
                    <tr key={sm.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{sm.staff?.name}</td>
                      <td className="px-5 py-3.5 font-medium text-emerald-700">
                        {sm.roleTitle || 'Technician'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{sm.staff?.email}</td>
                      <td className="px-5 py-3.5 text-slate-500">{sm.staff?.phone || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INVITATIONS */}
      {activeTab === 'invitations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">Property Invitations</h3>
              <p className="text-xs text-slate-500">
                Generate expiring, single-use registration tokens for tenants or maintenance staff.
              </p>
            </div>
            <button
              onClick={() => {
                setModalError(null);
                setGeneratedInviteLink(null);
                setIsInviteModalOpen(true);
              }}
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Generate Invitation Link
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Target Unit</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Expires At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {invitations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-400">
                      No invitations generated yet.
                    </td>
                  </tr>
                ) : (
                  invitations.map((inv: any) => {
                    const isAccepted = !!inv.acceptedAt;
                    const isExpired = new Date(inv.expiresAt) < new Date();
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3.5">
                          <Badge variant={inv.role === 'STAFF' ? 'warning' : 'info'}>
                            {inv.role}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-slate-700 font-medium">
                          {inv.unit ? `Unit ${inv.unit.unitNumber}` : 'General Membership'}
                        </td>
                        <td className="px-5 py-3.5">
                          {isAccepted ? (
                            <Badge variant="success">Accepted</Badge>
                          ) : isExpired ? (
                            <Badge variant="danger">Expired</Badge>
                          ) : (
                            <Badge variant="warning">Pending Activation</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Add Unit */}
      <Modal isOpen={isUnitModalOpen} onClose={() => setIsUnitModalOpen(false)} title="Add Unit">
        {modalError && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
            {modalError}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Unit Number</label>
            <input
              type="text"
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              placeholder="e.g. 101, 204B"
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Floor Level</label>
            <input
              type="number"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              min={1}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Description (Optional)</label>
            <input
              type="text"
              value={unitDescription}
              onChange={(e) => setUnitDescription(e.target.value)}
              placeholder="2 Bed, 2 Bath Courtyard View"
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-3">
            <button
              onClick={() => setIsUnitModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => createUnitMutation.mutate()}
              disabled={createUnitMutation.isPending || !unitNumber}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {createUnitMutation.isPending ? 'Saving...' : 'Add Unit'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal 2: Assign Tenancy */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Tenant to Unit">
        {modalError && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
            {modalError}
          </div>
        )}
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Assign a registered tenant account to this unit. Active assignments must not overlap for an
            exclusively occupied unit.
          </p>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Tenant Email Address</label>
            <input
              type="email"
              value={tenantEmail}
              onChange={(e) => setTenantEmail(e.target.value)}
              placeholder="tenant@example.com"
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Lease Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-3">
            <button
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => assignTenancyMutation.mutate()}
              disabled={assignTenancyMutation.isPending || !tenantEmail}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {assignTenancyMutation.isPending ? 'Assigning...' : 'Assign Tenant'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal 3: Add Staff */}
      <Modal isOpen={isStaffModalOpen} onClose={() => setIsStaffModalOpen(false)} title="Add Maintenance Staff">
        {modalError && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
            {modalError}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Staff User Email</label>
            <input
              type="email"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              placeholder="staff@example.com"
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Title / Specialty</label>
            <input
              type="text"
              value={staffRoleTitle}
              onChange={(e) => setStaffRoleTitle(e.target.value)}
              placeholder="Senior Maintenance Lead / Plumber"
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-3">
            <button
              onClick={() => setIsStaffModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => addStaffMutation.mutate()}
              disabled={addStaffMutation.isPending || !staffEmail}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {addStaffMutation.isPending ? 'Adding...' : 'Add Staff Member'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal 4: Generate Invitation Link */}
      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Generate Invitation">
        {modalError && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
            {modalError}
          </div>
        )}

        {generatedInviteLink ? (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Invitation Link Ready!</h4>
            <p className="text-xs text-slate-600">
              Share this single-use link with the invitee. It is valid for 7 days.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between space-x-2">
              <input
                type="text"
                readOnly
                value={generatedInviteLink}
                className="text-xs bg-transparent text-slate-800 w-full font-mono outline-none"
              />
              <button
                type="button"
                onClick={() => handleCopyLink(generatedInviteLink)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 shrink-0"
                title="Copy link"
              >
                {copiedToken === generatedInviteLink ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">Role to Assign</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="TENANT">Tenant (Assigns to unit)</option>
                <option value="STAFF">Maintenance Staff</option>
              </select>
            </div>

            {inviteRole === 'TENANT' && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">Assign to Unit</label>
                <select
                  value={inviteUnitId}
                  onChange={(e) => setInviteUnitId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="">Select a unit...</option>
                  {units.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      Unit {u.unitNumber} (Floor {u.floor})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-3">
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => createInviteMutation.mutate()}
                disabled={createInviteMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {createInviteMutation.isPending ? 'Generating...' : 'Generate Token Link'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
