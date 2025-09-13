import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { searchLocationSchema, type SearchLocation } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Search, MapPin, ChevronDown } from "lucide-react";

interface State {
  code: string;
  name: string;
}

interface TreeSearchFormProps {
  onSearch: (city: string, state: string) => void;
}

export default function TreeSearchForm({ onSearch }: TreeSearchFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SearchLocation>({
    resolver: zodResolver(searchLocationSchema),
    defaultValues: {
      city: "",
      state: "",
    },
  });

  const { data: states = [] } = useQuery<State[]>({
    queryKey: ["/api/states"],
  });

  const handleSubmit = async (data: SearchLocation) => {
    setIsSubmitting(true);
    try {
      onSearch(data.city, data.state);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* City Input */}
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        placeholder="Enter city name"
                        className="pr-10"
                        data-testid="input-city"
                      />
                      <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* State Select */}
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>State</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-state">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Search Button */}
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full md:w-auto px-8 py-3"
                data-testid="button-search"
              >
                <Search className="w-4 h-4 mr-2" />
                Find Trees
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
