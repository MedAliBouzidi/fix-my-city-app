import React from 'react';
import { IncidentStatus } from '../types/incident';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Hammer,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';

interface IncidentTimelineProps {
  status: IncidentStatus;
}

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function IncidentTimeline({ status }: IncidentTimelineProps) {
  const steps: Step[] = [
    {
      id: 'RECEIVED',
      title: 'Report Received',
      description: 'Submitted into municipal intake system',
      icon: Clock,
    },
    {
      id: 'PENDING_VALIDATION',
      title: 'Inspection Assigned',
      description: 'Field agent inspecting site',
      icon: UserCheck,
    },
    {
      id: 'VALIDATED',
      title: 'Validated by Agent',
      description: 'Urgency & veracity confirmed',
      icon: ShieldCheck,
    },
    {
      id: 'ASSIGNED',
      title: 'Technician Assigned',
      description: 'Repair crew dispatched',
      icon: Hammer,
    },
    {
      id: 'IN_PROGRESS',
      title: 'Repairs In Progress',
      description: 'Field maintenance underway',
      icon: Hammer,
    },
    {
      id: 'RESOLVED',
      title: 'Certified Resolved',
      description: 'Incident verified & closed',
      icon: CheckCircle2,
    },
  ];

  // Map status to current progress index
  const getStatusIndex = (currentStatus: IncidentStatus): number => {
    switch (currentStatus) {
      case 'RECEIVED':
        return 0;
      case 'PENDING_VALIDATION':
        return 1;
      case 'VALIDATED':
        return 2;
      case 'REJECTED':
        return 2; // Terminal rejected branch
      case 'ASSIGNED':
        return 3;
      case 'IN_PROGRESS':
        return 4;
      case 'RESOLVED':
        return 5;
      default:
        return 0;
    }
  };

  const currentIndex = getStatusIndex(status);
  const isRejected = status === 'REJECTED';

  return (
    <div className="py-2">
      <ol className="relative border-l-2 border-slate-200 ml-4 space-y-6">
        {steps.map((step, index) => {
          const isPassed = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;

          // Special branch for REJECTED at step 2
          if (isRejected && index === 2) {
            return (
              <li key={step.id} className="ml-6">
                <span className="absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-rose-700 ring-4 ring-white border border-rose-300">
                  <XCircle className="h-4 w-4" />
                </span>
                <h4 className="text-sm font-bold text-rose-800">
                  Report Rejected
                </h4>
                <p className="text-xs text-rose-600">
                  Inspection determined report could not be validated for municipal intervention.
                </p>
              </li>
            );
          }

          if (isRejected && index > 2) {
            return (
              <li key={step.id} className="ml-6 opacity-40">
                <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-400 ring-4 ring-white">
                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                </span>
                <h4 className="text-xs font-medium text-slate-500">
                  {step.title}
                </h4>
              </li>
            );
          }

          const StepIcon = step.icon;

          return (
            <li key={step.id} className="ml-6">
              <span
                className={`absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-white transition ${
                  isPassed
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isPassed ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <StepIcon className="h-4 w-4" />
                )}
              </span>

              <div className="flex flex-col">
                <span
                  className={`text-sm font-bold ${
                    isCurrent
                      ? 'text-blue-700 font-extrabold'
                      : isPassed
                      ? 'text-slate-800'
                      : 'text-slate-400 font-normal'
                  }`}
                >
                  {step.title}
                  {isCurrent && (
                    <span className="ml-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 uppercase tracking-wider">
                      Current Stage
                    </span>
                  )}
                </span>
                <span className="text-xs text-slate-500 mt-0.5">
                  {step.description}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
