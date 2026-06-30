/// Represents a single rental listing. Note that the backend sometimes
/// returns a LOCKED version of this data (for anonymous users — only
/// price, status, and images) and sometimes the FULL version (for
/// logged-in users). We handle both shapes by making every field
/// except id and price nullable, since a locked response simply won't
/// include them.
class Listing {
  final int id;
  final String? title;
  final String priceePerMonth;
  final String? district;
  final String? roomType;
  final String? description;
  final String status;
  final bool locked;
  final String? lockedMessage;
  final List<String> imageUrls;

  Listing({
    required this.id,
    this.title,
    required this.priceePerMonth,
    this.district,
    this.roomType,
    this.description,
    required this.status,
    required this.locked,
    this.lockedMessage,
    required this.imageUrls,
  });

  factory Listing.fromJson(Map<String, dynamic> json) {
    final List<dynamic> rawImages = json["images"] ?? [];
    final List<String> urls = rawImages
        .map((image) => image["image_url"] as String)
        .toList();

    return Listing(
      id: json["id"],
      title: json["title"],
      priceePerMonth: json["price_per_month"].toString(),
      district: json["district"],
      roomType: json["room_type"],
      description: json["description"],
      status: json["status"] ?? "available",
      locked: json["locked"] ?? false,
      lockedMessage: json["message"],
      imageUrls: urls,
    );
  }
}