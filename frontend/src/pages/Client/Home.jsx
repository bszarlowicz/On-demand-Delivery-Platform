import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { House } from "react-bootstrap-icons";
import { PinAngle } from "react-bootstrap-icons";
import { BoxFill } from "react-bootstrap-icons";
import { BoxSeamFill } from "react-bootstrap-icons";
import { Box2Fill } from "react-bootstrap-icons";
import axios from "axios";
import Navbar from "../../components/Layouts/Navbar";
import DeliveryOption from "../../components/HomeComponents/DeliveryOption";
import PackageOption from "../../components/HomeComponents/PackageOption";
import AddressFormSection from "../../components/HomeComponents/AddressFormSection";
import Validation from "../../utils/orderValidation";
import customHome from "../../assets/css/Home.module.css";
import "../../assets/css/Home.module.css";
import ZPL from "../../assets/css/ZPL.module.css";
function Home() {
  axios.defaults.withCredentials = true;

  const [values, setValues] = useState({
    //deliveryOption: "",
    packageOption: "Small",
    InputZipCode1: "",
    InputCity1: "",
    InputStreet1: "",
    InputBuildingNumber1: "",
    InputApartmentNumber1: "",
    InputZipCode2: "",
    InputCity2: "",
    InputStreet2: "",
    InputBuildingNumber2: "",
    InputApartmentNumber2: "",
  });

  const [errors, setErrors] = useState({});
  const [auth, setAuth] = useState(false);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState("");
  const [labelImage, setLabelImage] = useState("");
  const [isZPLVisible, setZPLVisible] = useState(false);
  const navigate = useNavigate();

  const handleInput = (event) => {
    setValues((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = Validation(values);
    setErrors(validationErrors);

    console.log("Validation Errors:", validationErrors);
    if (
      !validationErrors.InputZipCode1 &&
      !validationErrors.InputZipCode2 &&
      !validationErrors.InputCity1 &&
      !validationErrors.InputCity2 &&
      !validationErrors.InputStreet1 &&
      !validationErrors.InputStreet2 &&
      !validationErrors.InputBuildingNumber1 &&
      !validationErrors.InputBuildingNumber2
    ) {
      try {
        await axios.post("http://localhost:8081/home", values);
        handleGenerateZPL(); // Dodaj to wywołanie
      } catch (err) {
        console.log(err);
      }
    }
  };

  useEffect(() => {
    axios
      .get("http://localhost:8081")
      .then((res) => {
        console.log("API Response:", res.data);
        if (res.data.valid) {
          setAuth(true);
          setUser(res.data.name);
        } else {
          setAuth(false);
          navigate("/login");
          setMessage(res.data.Error);
        }
      })
      .catch((err) => console.log(err));
  }, [navigate]);

  function convertToZPLString(inputString) {
    const polishCharsMap = {
      ą: "a",
      ć: "c",
      ę: "e",
      ł: "l",
      ń: "n",
      ó: "o",
      ś: "s",
      ź: "z",
      ż: "z",
      Ą: "A",
      Ć: "C",
      Ę: "E",
      Ł: "L",
      Ń: "N",
      Ó: "O",
      Ś: "S",
      Ź: "Z",
      Ż: "Z",
    };

    return inputString.replace(
      /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g,
      (match) => polishCharsMap[match] || match
    );
  }

  const handleGenerateZPL = async () => {
    try {
      const validationErrors = Validation(values);

      if (
        validationErrors.InputZipCode1 ||
        validationErrors.InputZipCode2 ||
        validationErrors.InputCity1 ||
        validationErrors.InputCity2 ||
        validationErrors.InputStreet1 ||
        validationErrors.InputStreet2 ||
        validationErrors.InputBuildingNumber1 ||
        validationErrors.InputBuildingNumber2
      ) {
        return;
      }
      const generatedZPL = `^XA
      ^FX Top section with logo, name, and address.
      ^CF0,30
      ^FO50,50^GB700,3,3^FS
      ^FO75,75^FR^GB100,100,100^FS
      ^FO93,93^GB40,40,40^FS
      ^FO220,50^FDIntershipping, Inc.^FS
      ^CF0,20
      ^FO220,115^FD${convertToZPLString(values.InputZipCode1)}^FS
      ^FO220,155^FD${convertToZPLString(values.InputCity1)}^FS
      ^FO220,195^FD${convertToZPLString(values.InputStreet1)}^FS
      ^FO220,195^FD${convertToZPLString(values.InputApartmentNumber1)}^FS
      ^FO50,250^GB700,3,3^FS
      
      ^FX Second section with recipient address.
      ^CFA,30
      ^FO50,300^FD${convertToZPLString(values.InputZipCode2)}^FS
      ^FO50,340^FD${convertToZPLString(values.InputCity2)}^FS
      ^FO50,380^FD${convertToZPLString(values.InputStreet2)}^FS
      ^FO50,420^FD${convertToZPLString(values.InputBuildingNumber2)}^FS
      ^FO50,460^FD${convertToZPLString(values.InputApartmentNumber2)}^FS
      
      ^FO50,500^GB700,3,3^FS
      
      ^FX Third section with bar code.
      ^BY5,2,270
      ^FO100,550^BC^FD12345678^FS
      
      ^FX Fourth section (the two boxes on the bottom).
      ^FO50,900^GB700,250,3^FS
      ^FO400,900^GB3,250,3^FS
      ^CF0,20
      ^FO100,960^FDCtr. X34B-1^FS
      ^FO100,1010^FDREF1 F00B47^FS
      ^FO100,1060^FDREF2 BL4H8^FS
      ^CF0,40
      ^FO470,955^FDCA^FS
      ^XZ`;

      const response = await fetch(
        "http://api.labelary.com/v1/printers/8dpmm/labels/4x6/0/",
        {
          method: "POST",
          headers: {
            Accept: "image/png",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `${generatedZPL}`,
        }
      );

      if (response.ok) {
        const imageUrl = URL.createObjectURL(await response.blob());
        setLabelImage(imageUrl);
        setZPLVisible(true);
      } else {
        const errorMessage = await response.text();
        console.error("Error generating label:", errorMessage);
      }
    } catch (error) {
      console.error("Error generating label:", error);
    }
  };

  const handleDownloadImage = () => {
    const link = document.createElement("a");
    link.href = labelImage;
    link.download = "label_image.png";
    link.click();
  };

  return (
    <div>
      <Navbar />
      <div>
        {isZPLVisible ? (
          <div className={`mt-4 text-center`}>
            <div className={`w-400 rounded `}>
              <button onClick={() => setZPLVisible(false)}> Close </button>
              <button onClick={handleDownloadImage}>Download</button>

              <div>
                <img
                  src={labelImage}
                  alt="Label"
                  className={`img-fluid border p-2 rounded ${ZPL.customContainer}  `}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="row mt-5 mx-auto">
            <div className="text-center">
              <h2 className={`${customHome.customTextColorHeadings} display-4`}>
                Delivery destination
              </h2>
            </div>
            <div>
              <form
                className="w-60 mx-auto justify-content-center text-center"
                action=""
                onSubmit={handleSubmit}
              >
                {/* Delivery options components */}
                <div className="row justify-content-center mt-4 w-75 mx-auto">
                  <div
                    className={`${customHome.customColWidth} col-3 mx-5 d-flex justify-content-center mb-3`}
                  >
                    <DeliveryOption
                      icon={
                        <House
                          className={`${customHome.customIcon} m-auto mt-5`}
                        />
                      }
                      title="Address"
                      description="The courier will deliver the parcel directly to the address"
                    />
                  </div>

                  <div
                    className={`${customHome.customColWidth} col-3 mx-5 d-flex justify-content-center mb-3`}
                  >
                    <DeliveryOption
                      icon={
                        <PinAngle
                          className={`${customHome.customIcon} m-auto mt-5`}
                        />
                      }
                      title="Shipping point"
                      description="The courier will deliver the parcel at the shipping point"
                    />
                  </div>
                </div>

                <div className="row mt-5">
                  <div className="col-12 text-center">
                    <h2
                      className={`${customHome.customTextColorHeadings} display-4`}
                    >
                      Pack size
                    </h2>
                  </div>
                </div>

                {/* Package options components */}
                <div className="row justify-content-center mt-4 p-0 w-75 mx-auto">
                  <div
                    className={`${customHome.customColWidth} col-3 mx-4 d-flex justify-content-center mb-3`}
                  >
                    <PackageOption
                      icon={
                        <BoxFill
                          className={`${customHome.customIcon} m-auto mt-5`}
                        />
                      }
                      title="Small"
                      sizeInfo="max. 10 x 40 x 65 cm"
                      weightInfo="up to 10 kg"
                      price="$15"
                      value="Small"
                      onChange={handleInput}
                    />
                  </div>

                  <div
                    className={`${customHome.customColWidth} col-3 mx-4 d-flex justify-content-center mb-3`}
                  >
                    <PackageOption
                      icon={
                        <BoxSeamFill
                          className={`${customHome.customIcon} m-auto mt-5`}
                        />
                      }
                      title="Medium"
                      sizeInfo="max. 20 x 40 x 65 cm"
                      weightInfo="up to 20 kg"
                      price="$20"
                      value="Medium"
                      onChange={handleInput}
                    />
                  </div>

                  <div
                    className={`${customHome.customColWidth} col-3 mx-4 d-flex justify-content-center mb-3`}
                  >
                    <PackageOption
                      icon={
                        <Box2Fill
                          className={`${customHome.customIcon} m-auto mt-5`}
                        />
                      }
                      title="Large"
                      sizeInfo="max. 45 x 40 x 65 cm"
                      weightInfo="up to 30 kg"
                      price="$25"
                      value="Large"
                      onChange={handleInput}
                    />
                  </div>
                </div>

                <div className="row mt-5">
                  <div className="col-12 text-center">
                    <h2
                      className={`${customHome.customTextColorHeadings} display-4`}
                    >
                      Shipping details
                    </h2>
                  </div>
                </div>

                <div className="row justify-content-center mt-3 mb-5">
                  <div className="container">
                    <div className="row justify-content-center">
                      <AddressFormSection
                        label="Sender"
                        zipCodeId="InputZipCode1"
                        cityId="InputCity1"
                        streetId="InputStreet1"
                        buildingNumberId="InputBuildingNumber1"
                        apartmentNumberId="InputApartmentNumber1"
                        zipCode={values.InputZipCode1}
                        city={values.InputCity1}
                        street={values.InputStreet1}
                        buildingNumber={values.InputBuildingNumber1}
                        apartmentNumber={values.InputApartmentNumber1}
                        errors={errors}
                        handleInput={handleInput}
                      />

                      <AddressFormSection
                        label="Recipient"
                        zipCodeId="InputZipCode2"
                        cityId="InputCity2"
                        streetId="InputStreet2"
                        buildingNumberId="InputBuildingNumber2"
                        apartmentNumberId="InputApartmentNumber2"
                        zipCode={values.InputZipCode2}
                        city={values.InputCity2}
                        street={values.InputStreet2}
                        buildingNumber={values.InputBuildingNumber2}
                        apartmentNumber={values.InputApartmentNumber2}
                        errors={errors}
                        handleInput={handleInput}
                      />
                    </div>
                  </div>

                  <div className="text-center mt-2">
                    <button
                      type="submit"
                      className={`${customHome.customButtonHome} btn btn-lg`}
                      style={{
                        padding: "8px 70px",
                      }}
                      onClick={handleGenerateZPL}
                    >
                      <strong>Submit</strong>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
