import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceApi, propertyApi } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  Wrench,
  ArrowLeft,
  Clock,
  User,
  MessageSquare,
  Paperclip,
  CheckCircle,
  AlertTriangle,
  Send,
  Building2,
  Calendar,
  Lock,
} from 'lucide-react';
import { StatusBadge, PriorityBadge, Badge } from '../../components/common/Badge.js';
import { Modal } from '../../components/common/Modal.js';
import { MaintenanceStatus } from '../../types/index.js';

export const MaintenanceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState('');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Fetch request details
  const { data, isLoading } = useQuery({
    queryKey: ['maintenance', id],
    queryFn: () => maintenanceApi.getRequestById(id!),
    enabled: !!id,
    refetchInterval: 15000,
  });

  const request = data?.request;

  // Add Comment Mutation
  const addCommentMutation = useMutation({
    mutationFn: () => maintenanceApi.addComment(id!, commentText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', id] });
      setCommentText('');
    },
  });

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: (status: MaintenanceStatus) => maintenanceApi.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', id] });
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Assign Staff Mutation
  const assignStaffMutation = useMutation({
    mutationFn: () => maintenanceApi.assignStaff(id!, selectedStaffId || null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', id] });
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      setIsAssignModalOpen(false);
    },
    onError: (err: any) => setModalError(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-md mx-auto">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Request Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">
          This maintenance ticket does not exist or you do not have permission to view it.
        </p>
      </div>
    );
  }

  const isCompleted = request.status === 'COMPLETED';
  const canUpdateStatus =
    !isCompleted &&
    (user?.role === 'OWNER' || (user?.role === 'STAFF' && request.assignedStaffId === user?.id));

  const staffMembers = request.property?.staffMembers || [];

  return (
    <div className="space-y-6">
      {/* Top back navigation */}
      <div>
        <Link
          to={
            user?.role === 'OWNER'
              ? '/owner/maintenance'
              : user?.role === 'TENANT'
              ? '/tenant/maintenance'
              : '/staff/requests'
          }
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Maintenance List
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{request.title}</h1>
              <StatusBadge status={request.status} isOverdue={request.isOverdue} />
              <PriorityBadge priority={request.priority} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ticket #{request.id.slice(0, 8)} • Logged on{' '}
              {new Date(request.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>

          {/* Quick status transition bar */}
          {canUpdateStatus && (
            <div className="flex items-center space-x-2">
              {request.status === 'PENDING' && (
                <button
                  onClick={() => updateStatusMutation.mutate('IN_PROGRESS')}
                  disabled={updateStatusMutation.isPending}
                  className="px-3.5 py-1.5 text-xs font-semibold text-teal-800 bg-teal-100 hover:bg-teal-200 rounded-lg transition"
                >
                  Mark In Progress
                </button>
              )}
              {request.status === 'IN_PROGRESS' && (
                <button
                  onClick={() => updateStatusMutation.mutate('COMPLETED')}
                  disabled={updateStatusMutation.isPending}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition"
                >
                  Mark Completed
                </button>
              )}
            </div>
          )}

          {isCompleted && (
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Completed Ticket (Read-Only)</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Description, Attachments, Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Issue Description Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Issue Description
            </h3>
            <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">
              {request.description}
            </p>

            {/* Photos / Attachments */}
            {request.attachments && request.attachments.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center">
                  <Paperclip className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  Attached Photos ({request.attachments.length})
                </h4>
                <div className="flex flex-wrap gap-3">
                  {request.attachments.map((att) => (
                    <button
                      key={att.id}
                      onClick={() =>
                        setSelectedImage(`/api/maintenance/attachments/${att.storageKey}`)
                      }
                      className="group relative rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:border-emerald-500 transition-all text-left"
                    >
                      <img
                        src={`/api/maintenance/attachments/${att.storageKey}`}
                        alt={att.originalName}
                        className="w-24 h-24 object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="block p-1 text-[10px] text-slate-600 bg-white truncate max-w-[96px]">
                        {att.originalName}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Comments & Communication Thread */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center">
              <MessageSquare className="w-4 h-4 mr-2 text-emerald-600" />
              Activity & Communication Thread ({request.comments?.length || 0})
            </h3>

            {/* Messages list */}
            <div className="space-y-4 max-h-96 overflow-y-auto mb-6 pr-2">
              {(!request.comments || request.comments.length === 0) ? (
                <p className="text-xs text-slate-400 py-4 text-center italic">
                  No comments yet. Post an update or question below.
                </p>
              ) : (
                request.comments.map((c) => {
                  const isAuthorMe = c.authorId === user?.id;
                  return (
                    <div
                      key={c.id}
                      className={`p-3.5 rounded-xl text-xs space-y-1 ${
                        isAuthorMe
                          ? 'bg-emerald-50/70 border border-emerald-100 ml-6'
                          : 'bg-slate-50 border border-slate-100 mr-6'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                          <span>{c.author.name}</span>
                          <Badge variant={c.author.role === 'STAFF' ? 'warning' : c.author.role === 'OWNER' ? 'purple' : 'info'}>
                            {c.author.role}
                          </Badge>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                          • {new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-slate-700 whitespace-pre-line leading-relaxed">{c.message}</p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Post comment input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (commentText.trim()) addCommentMutation.mutate();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Type a progress update or note..."
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={addCommentMutation.isPending || !commentText.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50 flex items-center space-x-1"
              >
                <span>Send</span>
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Metadata, Staff Assignment, Status History Timeline */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-xs space-y-3">
            <h3 className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
              Location & Resident
            </h3>

            <div>
              <span className="text-slate-500">Property:</span>
              <p className="font-bold text-slate-900 mt-0.5">{request.property?.name}</p>
            </div>

            <div>
              <span className="text-slate-500">Unit:</span>
              <p className="font-bold text-slate-900 mt-0.5">
                Unit {request.unit?.unitNumber} (Floor {request.unit?.floor})
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-500">Resident / Tenant:</span>
              <p className="font-bold text-slate-900 mt-0.5">{request.tenant?.name}</p>
              <p className="text-slate-500">{request.tenant?.email}</p>
              {request.tenant?.phone && <p className="text-slate-500">{request.tenant?.phone}</p>}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Assigned Technician:</span>
                {user?.role === 'OWNER' && !isCompleted && (
                  <button
                    onClick={() => {
                      setSelectedStaffId(request.assignedStaffId || '');
                      setIsAssignModalOpen(true);
                    }}
                    className="text-emerald-600 font-semibold hover:underline text-[11px]"
                  >
                    Change
                  </button>
                )}
              </div>
              <p className="font-bold text-slate-900 mt-0.5">
                {request.assignedStaff ? request.assignedStaff.name : <span className="italic text-slate-400">Unassigned</span>}
              </p>
            </div>

            {request.completedAt && (
              <div className="pt-2 border-t border-slate-100 text-emerald-800 bg-emerald-50 p-2.5 rounded-lg">
                <span className="font-bold">Resolved & Completed:</span>
                <p className="mt-0.5">{new Date(request.completedAt).toLocaleString()}</p>
                {request.resolutionHours !== null && (
                  <p className="mt-0.5 text-[11px]">Resolution time: {request.resolutionHours} hours</p>
                )}
              </div>
            )}
          </div>

          {/* Status History Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-4 flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Status Audit History
            </h3>

            <div className="space-y-4 relative before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-slate-200">
              {request.statusHistory?.map((hist) => (
                <div key={hist.id} className="relative flex items-start space-x-3 text-xs pl-6">
                  <div className="absolute left-0.5 top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-emerald-600 shrink-0" />
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-slate-900">{hist.newStatus}</span>
                      <span className="text-[10px] text-slate-400">
                        by {hist.changedBy.name} ({hist.changedBy.role})
                      </span>
                    </div>
                    {hist.notes && <p className="text-slate-600 mt-0.5">{hist.notes}</p>}
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(hist.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Staff Modal (Owner only) */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Maintenance Staff">
        {modalError && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
            {modalError}
          </div>
        )}
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Select a staff technician assigned to this property:
          </p>
          <div>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="">Unassigned</option>
              {staffMembers.map((sm: any) => (
                <option key={sm.staff.id} value={sm.staff.id}>
                  {sm.staff.name} ({sm.roleTitle || 'Technician'})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-3">
            <button
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => assignStaffMutation.mutate()}
              disabled={assignStaffMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {assignStaffMutation.isPending ? 'Updating...' : 'Save Assignment'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Image Preview Modal */}
      <Modal isOpen={!!selectedImage} onClose={() => setSelectedImage(null)} title="Attachment Photo" maxWidth="lg">
        {selectedImage && (
          <div className="flex justify-center p-2">
            <img
              src={selectedImage}
              alt="Attachment"
              className="max-h-[70vh] rounded-xl object-contain border border-slate-200 shadow-md"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};
