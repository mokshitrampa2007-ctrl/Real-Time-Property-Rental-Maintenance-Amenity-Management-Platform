import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyApi, maintenanceApi } from '../../api/index.js';
import { Wrench, ArrowLeft, Upload, AlertCircle, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const createRequestFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  category: z.enum([
    'PLUMBING',
    'ELECTRICAL',
    'HVAC',
    'APPLIANCE',
    'STRUCTURAL',
    'PEST_CONTROL',
    'GENERAL',
  ]),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
});

type FormDataValues = z.infer<typeof createRequestFormSchema>;

export const CreateMaintenancePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch active tenancy to know property & unit
  const { data: tenancyData, isLoading } = useQuery({
    queryKey: ['my-tenancy'],
    queryFn: () => propertyApi.getTenantTenancy(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormDataValues>({
    resolver: zodResolver(createRequestFormSchema),
    defaultValues: {
      category: 'PLUMBING',
      priority: 'MEDIUM',
    },
  });

  const tenancy = tenancyData?.tenancy;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const validFiles = filesArray.filter((f) =>
        ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
      );
      if (validFiles.length < filesArray.length) {
        setError('Only JPEG, PNG, or WebP images are permitted.');
      } else {
        setError(null);
      }
      setSelectedFiles(validFiles.slice(0, 4)); // Max 4 files
    }
  };

  const onSubmit = async (values: FormDataValues) => {
    if (!tenancy) {
      setError('No active lease found. You cannot submit maintenance requests.');
      return;
    }

    try {
      setError(null);
      const formData = new FormData();
      formData.append('propertyId', tenancy.propertyId);
      formData.append('unitId', tenancy.unitId);
      formData.append('title', values.title);
      formData.append('category', values.category);
      formData.append('priority', values.priority);
      formData.append('description', values.description);

      selectedFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      const res = await maintenanceApi.createRequest(formData);
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate(`/maintenance/${res.request.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit maintenance request.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tenancy) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No Active Tenancy</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          You must be assigned to an active lease before submitting maintenance tickets.
        </p>
        <Link to="/tenant/dashboard" className="text-xs font-semibold text-emerald-600 hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          to="/tenant/maintenance"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Maintenance List
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Report a Maintenance Issue</h1>
        <p className="text-sm text-slate-500 mt-1">
          Submitting for <span className="font-semibold text-slate-800">{tenancy.property?.name}</span> • Unit{' '}
          <span className="font-semibold text-slate-800">{tenancy.unit?.unitNumber}</span>
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Issue Title</label>
            <input
              type="text"
              {...register('title')}
              placeholder="e.g. Master bathroom sink leaking under cabinet"
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {errors.title && <p className="mt-1 text-xs text-rose-600">{errors.title.message}</p>}
          </div>

          {/* Category & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">Category</label>
              <select
                {...register('category')}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="PLUMBING">Plumbing</option>
                <option value="ELECTRICAL">Electrical</option>
                <option value="HVAC">HVAC / Heating / Cooling</option>
                <option value="APPLIANCE">Appliance</option>
                <option value="STRUCTURAL">Structural</option>
                <option value="PEST_CONTROL">Pest Control</option>
                <option value="GENERAL">General</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">Urgency / Priority</label>
              <select
                {...register('priority')}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="LOW">Low (Cosmetic, minor)</option>
                <option value="MEDIUM">Medium (Standard repair)</option>
                <option value="HIGH">High (Impacting daily comfort)</option>
                <option value="URGENT">Urgent (Immediate active leak / hazard)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Detailed Description</label>
            <textarea
              {...register('description')}
              rows={4}
              placeholder="Describe what happened, where the issue is located, and any steps already taken..."
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {errors.description && <p className="mt-1 text-xs text-rose-600">{errors.description.message}</p>}
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Issue Photos (Optional, max 4 images, &le;5MB each)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-emerald-500 transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-8 w-8 text-slate-400" />
                <div className="flex text-xs text-slate-600">
                  <label className="relative cursor-pointer font-semibold text-emerald-600 hover:text-emerald-500 focus-within:outline-none">
                    <span>Upload photos</span>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-[11px] text-slate-400">JPEG, PNG, or WebP up to 5MB</p>
              </div>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedFiles.map((file, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                    {file.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <Link
              to="/tenant/maintenance"
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
            >
              {isSubmitting ? 'Submitting Request...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
