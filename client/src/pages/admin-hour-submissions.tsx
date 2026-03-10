import { Helmet } from "react-helmet";
import { Clock } from "lucide-react";

export default function AdminHourSubmissions() {
  return (
    <>
      <Helmet>
        <title>Hour Submissions — AeroLease Wise</title>
      </Helmet>
      <div className="flex flex-col items-center justify-center py-24">
        <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Clock className="h-8 w-8 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Hour Submissions</h1>
        <p className="text-gray-500">Hour Submissions — coming soon</p>
      </div>
    </>
  );
}
