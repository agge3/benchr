import { Card, CardContent } from '~/components/ui/card';

interface MetricCardProps {
  title: string;
  value: string | number;
}

export const MetricCard = ({ title, value }: MetricCardProps) => (
  <Card>
    <CardContent className="pt-6">
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
    </CardContent>
  </Card>
);
