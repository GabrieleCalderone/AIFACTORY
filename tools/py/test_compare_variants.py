import unittest

from compare_variants import compare, verdict, wilson


class WilsonTests(unittest.TestCase):
    def test_interval_contains_rate_and_shrinks_with_n(self):
        p1, lo1, hi1 = wilson(5, 100)
        p2, lo2, hi2 = wilson(50, 1000)
        self.assertAlmostEqual(p1, 0.05)
        self.assertTrue(lo1 <= p1 <= hi1)
        self.assertLess(hi2 - lo2, hi1 - lo1)

    def test_rejects_empty_sample(self):
        with self.assertRaises(ValueError):
            wilson(0, 0)


class CompareTests(unittest.TestCase):
    rows = [
        {"experiment_id": "EXP-9", "variant_id": "A", "post_slug": "a", "saves": "12", "reach": "600"},
        {"experiment_id": "EXP-9", "variant_id": "B", "post_slug": "b", "saves": "15", "reach": "580"},
        {"experiment_id": "EXP-9", "variant_id": "C", "post_slug": "c", "saves": "", "reach": ""},
    ]

    def test_missing_metrics_are_reported_not_estimated(self):
        results = compare(self.rows, "saves", "reach")
        self.assertEqual(results[2]["status"], "no data")

    def test_small_samples_do_not_declare_a_winner(self):
        results = compare(self.rows, "saves", "reach")
        self.assertIn("not distinguishable", verdict(results))

    def test_clear_difference_is_reported(self):
        rows = [
            {"experiment_id": "E", "variant_id": "A", "post_slug": "a", "saves": "10", "reach": "5000"},
            {"experiment_id": "E", "variant_id": "B", "post_slug": "b", "saves": "200", "reach": "5000"},
        ]
        self.assertIn("variant B is ahead", verdict(compare(rows, "saves", "reach")))


if __name__ == "__main__":
    unittest.main()
